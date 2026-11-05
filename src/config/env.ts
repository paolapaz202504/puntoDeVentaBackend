import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Determinar archivo según NODE_ENV (production -> .env.production, sino .env.development o .env)
const nodeEnv = process.env.NODE_ENV || "development";
const envFileName = nodeEnv === "production" ? ".env.production" : ".env.development";

// Resolución flexible: si process.cwd() es la raíz del proyecto o la carpeta /backend
let envPath = path.resolve(process.cwd(), envFileName);
let fallbackEnvPath = path.resolve(process.cwd(), ".env");

if (!fs.existsSync(envPath)) {
  const backendEnvPath = path.resolve(process.cwd(), "backend", envFileName);
  if (fs.existsSync(backendEnvPath)) {
    envPath = backendEnvPath;
  }
}

if (!fs.existsSync(fallbackEnvPath)) {
  const backendFallbackPath = path.resolve(process.cwd(), "backend", ".env");
  if (fs.existsSync(backendFallbackPath)) {
    fallbackEnvPath = backendFallbackPath;
  }
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(fallbackEnvPath)) {
  dotenv.config({ path: fallbackEnvPath });
} else {
  dotenv.config();
}

// Sanitización y enrutamiento estricto de base de datos
let rawDatabaseUrl = process.env.DATABASE_URL || "";
if (nodeEnv === "production") {
  // En producción debe apuntar obligatoriamente a refresqueriadbprod
  if (rawDatabaseUrl.includes("/test")) {
    rawDatabaseUrl = rawDatabaseUrl.replace(/\/test(\?|$)/, "/refresqueriadbprod$1");
  } else if (!rawDatabaseUrl) {
    rawDatabaseUrl = "mysql://8Bkv5seDjTruoLg.root:0nJXVCwR9Fx56cG1@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/refresqueriadbprod?sslaccept=strict&connection_limit=20&pool_timeout=30&connect_timeout=15";
  }
} else {
  // En desarrollo debe apuntar obligatoriamente a refresqueriadbdev
  if (rawDatabaseUrl.includes("/test")) {
    rawDatabaseUrl = rawDatabaseUrl.replace(/\/test(\?|$)/, "/refresqueriadbdev$1");
  } else if (!rawDatabaseUrl) {
    rawDatabaseUrl = "mysql://3du39bDqZhT9MKT.root:op8bKg2GE2NBuM9z@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/refresqueriadbdev?sslaccept=strict&connection_limit=20&pool_timeout=30&connect_timeout=15";
  }
}

// Asegurar que process.env.DATABASE_URL esté sincronizado
process.env.DATABASE_URL = rawDatabaseUrl;

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: rawDatabaseUrl,
  JWT_SECRET: process.env.JWT_SECRET || "fallback_super_secret_key_puntov_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || "",
  GCP_STORAGE_BUCKET: process.env.GCP_STORAGE_BUCKET || "punto_de_venta",
  GCP_KEY_FILE: process.env.GCP_KEY_FILE || "./gcp-key.json",
};
