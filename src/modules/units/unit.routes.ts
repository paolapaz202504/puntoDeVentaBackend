import { Router } from "express";
import { UnitController } from "./unit.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", UnitController.list);
router.get("/:id", UnitController.getById);
router.post("/", UnitController.create);
router.put("/:id", UnitController.update);
router.delete("/:id", UnitController.delete);

export default router;
