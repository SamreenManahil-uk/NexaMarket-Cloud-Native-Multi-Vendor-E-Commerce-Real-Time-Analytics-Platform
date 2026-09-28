import { Router } from "express";
import { categories, products, product } from "../controllers/catalogue.js";

export const catalogueRouter = Router();
catalogueRouter.get("/categories", categories);
catalogueRouter.get("/products", products);
catalogueRouter.get("/products/:id", product);
