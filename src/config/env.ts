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

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "fallback_super_secret_key_puntov_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || "",
  GCP_STORAGE_BUCKET: process.env.GCP_STORAGE_BUCKET || "punto_de_venta",
  GCP_KEY_FILE: process.env.GCP_KEY_FILE || "./gcp-key.json",
};
