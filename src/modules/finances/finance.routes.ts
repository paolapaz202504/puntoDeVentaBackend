import { Router } from "express";
import { FinanceController } from "./finance.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/outflows", FinanceController.getOutflows);
router.get("/flow", FinanceController.getFinancialFlow);
router.get("/dashboard-metrics", FinanceController.getDashboardMetrics);

export default router;
