import { Router } from "express";
import Tag from "../models/Tag.js";
import { ok } from "../utils/response.js";
import { escapeRegex } from "../utils/helpers.js";

const router = Router();

router.get("/api/tags", async (request, response, next) => {
  try {
    const search = String(request.query.search ?? "").trim();
    const filter = search ? { name: new RegExp(escapeRegex(search), "i") } : {};
    const tags = await Tag.find(filter).sort({ usageCount: -1 }).limit(20).lean();
    return ok(response, { tags });
  } catch (error) {
    next(error);
  }
});

router.get("/api/tags/:name", async (request, response, next) => {
  try {
    const tag = await Tag.findOne({ name: request.params.name.toLowerCase() }).lean();
    return tag ? ok(response, { tag }) : ok(response, { tag: null });
  } catch (error) {
    next(error);
  }
});

export default router;
