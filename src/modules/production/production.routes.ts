import { Router } from "express";
import { ProductionController } from "./production.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/batches", ProductionController.listBatches);
router.post("/batches", ProductionController.produceBatch);

export default router;
