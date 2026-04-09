import assert from "node:assert/strict";
import {
  analyzePattern,
  compareRegexes,
  generateMatchingStrings,
} from "./regexEngine.js";
import { explainAst, parseRegexToAst } from "./services/regexParser.js";

const tests = [
  {
    name: "analyzePattern returns explanation and tester matches",
    run: () => {
      const result = analyzePattern({
        pattern: "a(b+c)*",
        flags: "g",
        testString: "abcb cab",
      });

      assert.equal(result.tester.matched, true);
      assert.equal(result.automata.supported, true);
      assert.ok(result.explanation.steps.length > 0);
      assert.ok(result.visualization.parseTree);
      assert.ok(result.visualization.nfa.edges.length > 0);
      assert.ok(result.visualization.dfa.nodes.length > 0);
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
        patternA: "a(b+c)",
        flagsA: "",
        patternB: "ab+ac",
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
        patternB: "ab{1,}",
        flagsB: "",
      });

      assert.equal(result.equivalent, false);
      assert.ok(result.counterexample);
      assert.equal(result.counterexample.raw, "a");
    },
  },
  {
    name: "nested quantifiers warn instead of blocking short safe inputs",
    run: () => {
      const analysis = analyzePattern({
        pattern: "(a{1,})*(a*b*)",
        flags: "",
        testString: "aaab",
      });

      const generation = generateMatchingStrings({
        pattern: "(a{1,})*(a*b*)",
        flags: "",
        maxLength: 6,
        count: 5,
      });

      assert.equal(analysis.tester.matched, true);
      assert.ok(
        analysis.warnings.some((warning) => warning.includes("nested quantifiers")),
      );
      assert.ok(generation.generation.producedCount >= 0);
    },
  },
  {
    name: "explanations show concrete quantifier tokens like {1,}",
    run: () => {
      const { ast } = parseRegexToAst("a{1,}");
      const explanation = explainAst(ast);

      assert.ok(explanation.steps.some((step) => step.label === "{1,}"));
    },
  },
  {
    name: "live tester translates plus into alternation",
    run: () => {
      const result = analyzePattern({
        pattern: "cat+dog",
        flags: "g",
        testString: "cat bird dog",
      });

      assert.equal(result.tester.totalMatches, 2);
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
