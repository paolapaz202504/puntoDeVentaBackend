import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err, path: req.path, method: req.method }, "Error en petición");

  // Error de validación Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Error de validación en los datos enviados",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Error de clave duplicada en MySQL/Prisma (P2002)
  if (err.code === "P2002") {
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(", ")
      : err.meta?.target || "campo único";
    return res.status(409).json({
      success: false,
      message: `Ya existe un registro con este valor duplicado: ${target}`,
    });
  }

  // Error de integridad referencial Prisma (P2003 / P2014)
  if (err.code === "P2003" || err.code === "P2014") {
    return res.status(409).json({
      success: false,
      message: "No se puede completar la operación por restricciones de integridad referencial",
    });
  }

  // Error genérico
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Ocurrió un error interno en el servidor",
  });
}
