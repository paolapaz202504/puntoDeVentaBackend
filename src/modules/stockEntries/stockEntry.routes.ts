import { Router } from "express";
import { StockEntryController } from "./stockEntry.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

// Todas las rutas de entradas requieren autenticación
router.use(authMiddleware);

router.get("/metrics", StockEntryController.getMetrics);
router.get("/", StockEntryController.list);
router.get("/:id", StockEntryController.getById);
router.post("/", StockEntryController.create);
router.post("/:id/payments", StockEntryController.addPayment);

export default router;
