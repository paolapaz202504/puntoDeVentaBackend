import { Router } from "express";
import { RoleController } from "./role.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

// Todas las rutas de roles requieren autenticación
router.use(authMiddleware);

router.get("/", RoleController.list);
router.get("/:id", RoleController.getById);
router.post("/", RoleController.create);
router.put("/:id", RoleController.update);
router.delete("/:id", RoleController.delete);

export default router;
