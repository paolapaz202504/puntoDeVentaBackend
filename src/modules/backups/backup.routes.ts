import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { BackupController } from "./backup.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

// Asegurar directorio importar_base_de_datos
const importDir = path.resolve(process.cwd(), "importar_base_de_datos");
if (!fs.existsSync(importDir)) {
  fs.mkdirSync(importDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, importDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `import-${uniqueSuffix}.sql`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith(".sql") || file.mimetype === "application/sql" || file.mimetype === "text/plain") {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten archivos de volcado de base de datos (.sql)"));
  },
});

router.use(authMiddleware);

router.post("/generate", BackupController.generate);
router.get("/history", BackupController.listLogs);
router.get("/download/:filename", BackupController.download);
router.post("/restore", upload.single("backup_file"), BackupController.restore);
router.get("/restore-history", BackupController.listRestoreLogs);

export default router;
