import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./modules/auth/auth.routes.js";
import roleRoutes from "./modules/roles/role.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import permissionRoutes from "./modules/permissions/permission.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import backupRoutes from "./modules/backups/backup.routes.js";
import areaRoutes from "./modules/areas/area.routes.js";
import tableRoutes from "./modules/tables/table.routes.js";
import unitRoutes from "./modules/units/unit.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import brandRoutes from "./modules/brands/brand.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import supplierRoutes from "./modules/suppliers/supplier.routes.js";
import recipeRoutes from "./modules/recipes/recipe.routes.js";
import productionRoutes from "./modules/production/production.routes.js";
import stockEntryRoutes from "./modules/stockEntries/stockEntry.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

// Middlewares globales
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  })
);

app.use(express.json());

// Servir archivos estáticos (logotipos en files/config, etc.)
app.use("/files", express.static(path.resolve(process.cwd(), "files")));

// Endpoint de diagnóstico
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "puntoV-backend",
    version: "1.0.1",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/stock-entries", stockEntryRoutes);

// Middleware de manejo centralizado de errores
app.use(errorHandler);
