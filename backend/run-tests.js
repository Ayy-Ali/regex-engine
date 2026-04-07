import assert from "node:assert/strict";
import {
  analyzePattern,
  compareRegexes,
  generateMatchingStrings,
} from "./regexEngine.js";

const tests = [
  {
    name: "analyzePattern returns explanation and tester matches",
    run: () => {
      const result = analyzePattern({
        pattern: "a(b|c)*",
        flags: "g",
        testString: "abcb cab",
      });

      assert.equal(result.tester.matched, true);
      assert.equal(result.automata.supported, true);
      assert.ok(result.explanation.steps.length > 0);
      assert.ok(result.visualization);
    },
  },
  {
    name: "generateMatchingStrings returns bounded examples",
    run: () => {
      const result = generateMatchingStrings({
        pattern: "ab?",
        flags: "",
        maxLength: 3,
        count: 5,
      });

      const values = result.generation.strings.map((entry) => entry.raw);
      assert.deepEqual(values.slice(0, 2), ["a", "ab"]);
    },
  },
  {
    name: "compareRegexes detects equivalent patterns",
    run: () => {
      const result = compareRegexes({
        patternA: "a(b|c)",
        flagsA: "",
        patternB: "ab|ac",
        flagsB: "",
      });

      assert.equal(result.equivalent, true);
      assert.equal(result.counterexample, null);
    },
  },
  {
    name: "compareRegexes returns a counterexample when patterns differ",
    run: () => {
      const result = compareRegexes({
        patternA: "ab*",
        flagsA: "",
        patternB: "ab+",
        flagsB: "",
      });

      assert.equal(result.equivalent, false);
      assert.ok(result.counterexample);
      assert.equal(result.counterexample.raw, "a");
    },
  },
];

let passed = 0;

for (const test of tests) {
  test.run();
  passed += 1;
  console.log(`PASS ${test.name}`);
}

console.log(`\n${passed}/${tests.length} backend checks passed`);
