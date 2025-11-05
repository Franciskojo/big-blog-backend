import { Router } from "express";
import { createCategory, getAllCategories, getCategoryBySlug } from "../controllers/categoryController.js";


const categoryRouter = Router();

// Route definitions
categoryRouter.post("/", createCategory);

categoryRouter.get("/", getAllCategories);

categoryRouter.get("/:slug", getCategoryBySlug);

export default categoryRouter;