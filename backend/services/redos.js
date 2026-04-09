import {
  MAX_PATTERN_LENGTH,
  MAX_TEST_STRING_LENGTH,
  createHttpError,
} from "./constants.js";

const nestedQuantifierPattern =
  /\((?:[^()\\]|\\.)*(?:\*|\?|\{\d+(?:,\d*)?\})(?:[^()\\]|\\.)*\)(?:\*|\?|\{\d+(?:,\d*)?\})/;

const ambiguousWildcardPattern = /(?:\.\*|\[[^\]]+\]\*)/;

export const assessRegexSafety = (pattern, testString = "") => {
  const warnings = [];
  const blockers = [];

  if (pattern.length > MAX_PATTERN_LENGTH) {
    blockers.push(
      `Pattern is too long (${pattern.length}). Please keep it within ${MAX_PATTERN_LENGTH} characters.`,
    );
  }

  if (testString.length > MAX_TEST_STRING_LENGTH) {
    blockers.push(
      `Test strings are limited to ${MAX_TEST_STRING_LENGTH} characters to avoid runaway regex evaluation.`,
    );
  }

  if (nestedQuantifierPattern.test(pattern)) {
    if (testString.length > 240) {
      blockers.push(
        "This regex looks like it contains nested quantifiers, which can trigger catastrophic backtracking on long test strings.",
      );
    } else {
      warnings.push(
        "This regex contains nested quantifiers. Keep test strings short to avoid slow backtracking in the live tester.",
      );
    }
  }

  if (ambiguousWildcardPattern.test(pattern) && testString.length > 240) {
    warnings.push(
      "Wildcard-heavy patterns can become slow on long strings, so the test string was capped aggressively.",
    );
  }

  if (/\\[1-9]/.test(pattern)) {
    warnings.push(
      "Backreferences are allowed in the tester, but they are excluded from the automata-based tools.",
    );
  }

  if (/\(\?[:!=<]/.test(pattern) || /\(\?<[^=]/.test(pattern)) {
    warnings.push(
      "Lookarounds or advanced group syntax will work only in the live tester, not in generation/equivalence mode.",
    );
  }

  return {
    safe: blockers.length === 0,
    warnings,
    blockers,
  };
};

export const enforceRegexSafety = (pattern, testString = "") => {
  const result = assessRegexSafety(pattern, testString);

  if (!result.safe) {
    throw createHttpError("Regex blocked for safety reasons.", result, 400);
  }

  return result;
};
