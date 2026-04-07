import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzePattern,
  compareRegexes,
  generateMatchingStrings,
} from "./regexEngine.js";

test("analyzePattern returns explanation and tester matches", () => {
  const result = analyzePattern({
    pattern: "a(b|c)*",
    flags: "g",
    testString: "abcb cab",
  });

  assert.equal(result.tester.matched, true);
  assert.equal(result.automata.supported, true);
  assert.ok(result.explanation.steps.length > 0);
  assert.ok(result.visualization);
});

test("generateMatchingStrings returns bounded examples", () => {
  const result = generateMatchingStrings({
    pattern: "ab?",
    flags: "",
    maxLength: 3,
    count: 5,
  });

  const values = result.generation.strings.map((entry) => entry.raw);
  assert.deepEqual(values.slice(0, 2), ["a", "ab"]);
});

test("compareRegexes detects equivalent patterns", () => {
  const result = compareRegexes({
    patternA: "a(b|c)",
    flagsA: "",
    patternB: "ab|ac",
    flagsB: "",
  });

  assert.equal(result.equivalent, true);
  assert.equal(result.counterexample, null);
});

test("compareRegexes returns a counterexample when patterns differ", () => {
  const result = compareRegexes({
    patternA: "ab*",
    flagsA: "",
    patternB: "ab+",
    flagsB: "",
  });

  assert.equal(result.equivalent, false);
  assert.ok(result.counterexample);
  assert.equal(result.counterexample.raw, "a");
});
