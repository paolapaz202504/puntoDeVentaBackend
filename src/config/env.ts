import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "fallback_super_secret_key_puntov_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
};
