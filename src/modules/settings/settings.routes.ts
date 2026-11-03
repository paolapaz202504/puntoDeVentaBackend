import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { SettingsController } from "./settings.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

// Asegurar que el directorio files/config exista
const configUploadDir = path.resolve(process.cwd(), "files", "config");
if (!fs.existsSync(configUploadDir)) {
  fs.mkdirSync(configUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, configUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten archivos de imagen válidos (.png, .jpg, .jpeg, .webp, .svg)"));
  },
});

// Lectura de configuración (pública o autenticada para mostrar en tickets/frontend)
router.get("/", SettingsController.get);

// Modificación y subida de logo requiere autenticación (ADMIN)
router.put("/", authMiddleware, SettingsController.update);
router.post("/logo", authMiddleware, upload.single("logo"), SettingsController.uploadLogo);

export default router;
