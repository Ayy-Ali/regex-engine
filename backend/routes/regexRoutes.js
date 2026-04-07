import { Router } from "express";
import {
  analyzeRegex,
  checkEquivalence,
  generateStrings,
  getTemplates,
} from "../controllers/regexController.js";

const router = Router();

router.get("/templates", getTemplates);
router.post("/analyze", analyzeRegex);
router.post("/generate", generateStrings);
router.post("/equivalence", checkEquivalence);

export default router;

