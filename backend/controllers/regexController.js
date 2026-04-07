import {
  analyzePattern,
  compareRegexes,
  generateMatchingStrings,
  getRegexTemplates,
} from "../regexEngine.js";

export const getTemplates = (_req, res) => {
  res.json({
    ok: true,
    templates: getRegexTemplates(),
  });
};

export const analyzeRegex = (req, res, next) => {
  try {
    const result = analyzePattern(req.body ?? {});
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const generateStrings = (req, res, next) => {
  try {
    const result = generateMatchingStrings(req.body ?? {});
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const checkEquivalence = (req, res, next) => {
  try {
    const result = compareRegexes(req.body ?? {});
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
