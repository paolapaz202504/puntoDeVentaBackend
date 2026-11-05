import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { prisma } from "../config/db.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    user: string;
    name: string;
    roles: Array<{ id: string; name: string }>;
    permissions: string[];
  };
}

interface CachedUser {
  id: string;
  user: string;
  name: string;
  roles: Array<{ id: string; name: string }>;
  permissions: string[];
  cachedAt: number;
}

// Caché en memoria para usuarios autenticados (TTL: 60 segundos)
const authUserCache = new Map<string, CachedUser>();

async function fetchUserFromDb(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      user_roles: {
        include: {
          role: {
            include: {
              role_permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No se proporcionó un token de autenticación válido",
    });
  }

  const token = authHeader.split(" ")[1];
  let decoded: { id: string; user: string };

  try {
    decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      id: string;
      user: string;
    };
  } catch (jwtError) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado. Inicie sesión nuevamente.",
    });
  }

  // 1. Comprobar si existe en caché válido (TTL de 60 segundos)
  const cached = authUserCache.get(decoded.id);
  const now = Date.now();
  if (cached && now - cached.cachedAt < 60_000) {
    req.user = {
      id: cached.id,
      user: cached.user,
      name: cached.name,
      roles: cached.roles,
      permissions: cached.permissions,
    };
    return next();
  }

  // 2. Si no está en caché o expiró, consultar la BD con retry ante demoras de red
  try {
    let dbUser: any = null;
    try {
      dbUser = await fetchUserFromDb(decoded.id);
    } catch (firstErr) {
      // Reintentar una vez tras 300ms por si la conexión del pool fue restablecida
      await new Promise((resolve) => setTimeout(resolve, 300));
      dbUser = await fetchUserFromDb(decoded.id);
    }

    if (!dbUser || !dbUser.is_active) {
      authUserCache.delete(decoded.id);
      return res.status(401).json({
        success: false,
        message: "El usuario ya no existe o se encuentra inactivo",
      });
    }

    // Extraer lista única de permisos heredados de todos los roles asignados
    const permissionSet = new Set<string>();
    const rolesList = dbUser.user_roles.map((ur: any) => {
      ur.role.role_permissions.forEach((rp: any) => {
        permissionSet.add(rp.permission.slug);
      });
      return {
        id: ur.role.id,
        name: ur.role.name,
      };
    });

    const userData = {
      id: dbUser.id,
      user: dbUser.user,
      name: dbUser.name,
      roles: rolesList,
      permissions: Array.from(permissionSet),
    };

    // Almacenar en caché para subsiguientes peticiones concurrentes
    authUserCache.set(decoded.id, {
      ...userData,
      cachedAt: now,
    });

    req.user = userData;
    next();
  } catch (error) {
    // Si la BD falló temporalmente pero tenemos datos en caché, utilizarlos como fallback resiliente
    if (cached) {
      req.user = {
        id: cached.id,
        user: cached.user,
        name: cached.name,
        roles: cached.roles,
        permissions: cached.permissions,
      };
      return next();
    }
    // Si no hay caché previo y falló la conexión con la BD, pasar el error a next(error) sin responder 401
    next(error);
  }
}
