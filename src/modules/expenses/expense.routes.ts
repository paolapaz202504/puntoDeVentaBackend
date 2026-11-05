import { Router } from "express";
import { ExpenseController } from "./expense.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", ExpenseController.list);
router.get("/:id", ExpenseController.getById);
router.post("/", ExpenseController.create);
router.delete("/:id", ExpenseController.delete);

export default router;
