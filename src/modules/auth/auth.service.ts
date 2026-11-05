import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db.js";
import { ENV } from "../../config/env.js";

export class AuthService {
  static async login(credentials: { user: string; password: string }) {
    const { user, password } = credentials;

    const dbUser = await prisma.user.findUnique({
      where: { user },
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

    if (!dbUser) {
      const error: any = new Error("Credenciales inválidas");
      error.statusCode = 401;
      throw error;
    }

    if (!dbUser.is_active) {
      const error: any = new Error("El usuario se encuentra inactivo. Contacte al administrador.");
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, dbUser.password_hash);
    if (!isMatch) {
      const error: any = new Error("Credenciales inválidas");
      error.statusCode = 401;
      throw error;
    }

    // Extraer lista consolidada de roles y permisos
    const permissionSet = new Set<string>();
    const roles = dbUser.user_roles.map((ur) => {
      ur.role.role_permissions.forEach((rp) => {
        permissionSet.add(rp.permission.slug);
      });
      return {
        id: ur.role.id,
        name: ur.role.name,
      };
    });

    // Generar JWT
    const token = jwt.sign(
      {
        id: dbUser.id,
        user: dbUser.user,
      },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      token,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        user: dbUser.user,
        email: dbUser.email,
        pin_code: dbUser.pin_code,
        roles,
        permissions: Array.from(permissionSet),
      },
    };
  }

  static async getProfile(userId: string) {
    const dbUser = await prisma.user.findUnique({
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

    if (!dbUser) {
      const error: any = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const permissionSet = new Set<string>();
    const roles = dbUser.user_roles.map((ur) => {
      ur.role.role_permissions.forEach((rp) => {
        permissionSet.add(rp.permission.slug);
      });
      return {
        id: ur.role.id,
        name: ur.role.name,
      };
    });

    return {
      id: dbUser.id,
      name: dbUser.name,
      user: dbUser.user,
      email: dbUser.email,
      pin_code: dbUser.pin_code,
      roles,
      permissions: Array.from(permissionSet),
      created_at: dbUser.created_at,
    };
  }

  static async updateProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      current_password?: string;
      new_password?: string;
      pin_code?: string;
    }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      const error: any = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const updateData: any = {
      updated_by: userId,
    };

    if (data.name) updateData.name = data.name;
    if (data.email !== undefined) {
      updateData.email = data.email && data.email.trim() !== "" ? data.email : null;
    }
    if (data.pin_code !== undefined) {
      updateData.pin_code = data.pin_code && data.pin_code.trim() !== "" ? data.pin_code : null;
    }

    if (data.new_password) {
      if (!data.current_password) {
        const error: any = new Error("Debe ingresar la contraseña actual para establecer una nueva");
        error.statusCode = 400;
        throw error;
      }
      const match = await bcrypt.compare(data.current_password, user.password_hash);
      if (!match) {
        const error: any = new Error("La contraseña actual no es correcta");
        error.statusCode = 400;
        throw error;
      }
      updateData.password_hash = await bcrypt.hash(data.new_password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        user_roles: {
          include: { role: true },
        },
      },
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      user: updatedUser.user,
      email: updatedUser.email,
      pin_code: updatedUser.pin_code,
      roles: updatedUser.user_roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    };
  }

  static async refreshToken(oldToken: string) {
    let decoded: any;
    try {
      // Validar firma del token permitiendo tokens recientemente expirados dentro del periodo de gracia
      decoded = jwt.verify(oldToken, ENV.JWT_SECRET, { ignoreExpiration: true });
    } catch (err) {
      const error: any = new Error("Token inválido o firma no autorizada");
      error.statusCode = 401;
      throw error;
    }

    if (!decoded || !decoded.id) {
      const error: any = new Error("Token malformado o incompleto");
      error.statusCode = 401;
      throw error;
    }

    // Ventana de gracia máxima para renovación: 7 días desde la expiración original
    const GRACE_PERIOD_SECONDS = 7 * 24 * 60 * 60; // 7 días
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (decoded.exp && nowInSeconds - decoded.exp > GRACE_PERIOD_SECONDS) {
      const error: any = new Error(
        "La sesión ha expirado definitivamente por inactividad prolongada. Inicie sesión nuevamente."
      );
      error.statusCode = 401;
      throw error;
    }

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

    if (!dbUser) {
      const error: any = new Error("El usuario ya no existe en el sistema");
      error.statusCode = 401;
      throw error;
    }

    if (!dbUser.is_active) {
      const error: any = new Error("El usuario se encuentra inactivo. Contacte al administrador.");
      error.statusCode = 403;
      throw error;
    }

    // Extraer lista consolidada de roles y permisos vigentes
    const permissionSet = new Set<string>();
    const roles = dbUser.user_roles.map((ur) => {
      ur.role.role_permissions.forEach((rp) => {
        permissionSet.add(rp.permission.slug);
      });
      return {
        id: ur.role.id,
        name: ur.role.name,
      };
    });

    // Generar nuevo JWT con vigencia completa renovada
    const newToken = jwt.sign(
      {
        id: dbUser.id,
        user: dbUser.user,
      },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      token: newToken,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        user: dbUser.user,
        email: dbUser.email,
        pin_code: dbUser.pin_code,
        roles,
        permissions: Array.from(permissionSet),
      },
    };
  }
}
