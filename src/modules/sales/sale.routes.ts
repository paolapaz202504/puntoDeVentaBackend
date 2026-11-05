import { Router } from "express";
import { SaleController } from "./sale.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/pos-products", SaleController.getPosProducts);
router.get("/", SaleController.list);
router.get("/:id", SaleController.getById);
router.post("/", SaleController.create);
router.patch("/:id/cancel", SaleController.cancel);

export default router;
