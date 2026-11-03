import { Router } from "express";
import { BrandController } from "./brand.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", BrandController.list);
router.get("/:id", BrandController.getById);
router.post("/", BrandController.create);
router.put("/:id", BrandController.update);
router.delete("/:id", BrandController.delete);

export default router;
