import type { Request, Response } from "express";
import * as catalogue from "../services/catalogue.js";

export async function categories(_req: Request, res: Response): Promise<void> {
  res.json({ data: await catalogue.listCategories() });
}
export async function products(req: Request, res: Response): Promise<void> {
  res.json(await catalogue.listProducts(req.query));
}
export async function product(req: Request<{ id: string }>, res: Response): Promise<void> {
  res.json({ data: await catalogue.getProduct(req.params.id) });
}
