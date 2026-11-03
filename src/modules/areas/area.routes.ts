import { Router } from "express";
import { AreaController } from "./area.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

// Todas las rutas de áreas requieren autenticación
router.use(authMiddleware);

router.get("/", AreaController.list);
router.get("/:id", AreaController.getById);
router.post("/", AreaController.create);
router.put("/:id", AreaController.update);
router.delete("/:id", AreaController.delete);

export default router;
