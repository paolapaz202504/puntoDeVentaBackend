import { Router } from "express";
import { PermissionController } from "./permission.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", PermissionController.list);
router.get("/roles/:roleId", PermissionController.getRolePermissions);
router.put("/roles/:roleId", PermissionController.setRolePermissions);

export default router;
