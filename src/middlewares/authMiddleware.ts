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

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No se proporcionó un token de autenticación válido",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      id: string;
      user: string;
    };

    // Validar que el usuario siga existiendo y esté activo
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
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

    if (!dbUser || !dbUser.is_active) {
      return res.status(401).json({
        success: false,
        message: "El usuario ya no existe o se encuentra inactivo",
      });
    }

    // Extraer lista única de permisos heredados de todos los roles asignados
    const permissionSet = new Set<string>();
    const rolesList = dbUser.user_roles.map((ur) => {
      ur.role.role_permissions.forEach((rp) => {
        permissionSet.add(rp.permission.slug);
      });
      return {
        id: ur.role.id,
        name: ur.role.name,
      };
    });

    req.user = {
      id: dbUser.id,
      user: dbUser.user,
      name: dbUser.name,
      roles: rolesList,
      permissions: Array.from(permissionSet),
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado. Inicie sesión nuevamente.",
    });
  }
}
