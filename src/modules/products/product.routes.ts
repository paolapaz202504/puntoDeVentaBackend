import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ProductController } from "./product.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

// Directorio files/products
const productsUploadDir = path.resolve(process.cwd(), "files", "products");
if (!fs.existsSync(productsUploadDir)) {
  fs.mkdirSync(productsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, productsUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `prod-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten archivos de imagen válidos (.png, .jpg, .jpeg, .webp, .svg)"));
  },
});

router.use(authMiddleware);

router.get("/", ProductController.list);
router.get("/presentations/list", ProductController.getPresentations);
router.get("/:id", ProductController.getById);
router.post("/upload-image", upload.single("image"), ProductController.uploadImage);
router.post("/", ProductController.create);
router.put("/:id", ProductController.update);
router.delete("/:id", ProductController.delete);

export default router;
