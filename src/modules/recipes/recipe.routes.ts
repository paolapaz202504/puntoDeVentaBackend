import { Router } from "express";
import { RecipeController } from "./recipe.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", RecipeController.list);
router.get("/:id", RecipeController.getById);
router.post("/", RecipeController.create);
router.put("/:id", RecipeController.update);
router.delete("/:id", RecipeController.delete);

export default router;
