import { Router } from "express";
import { TableController } from "./table.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

// Todas las rutas de mesas requieren autenticación
router.use(authMiddleware);

router.get("/", TableController.list);
router.get("/:id", TableController.getById);
router.post("/", TableController.create);
router.put("/:id", TableController.update);
router.delete("/:id", TableController.delete);

export default router;
