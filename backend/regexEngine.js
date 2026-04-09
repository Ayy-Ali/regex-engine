import {
  DEFAULT_ALPHABET,
  MAX_GENERATION_COUNT,
  MAX_GENERATION_LENGTH,
  MAX_HIGHLIGHT_MATCHES,
  REGEX_TEMPLATES,
  SUPPORTED_TEST_FLAGS,
  createHttpError,
  escapeVisible,
} from "./services/constants.js";
import {
  completeDfa,
  determinize,
  minimizeDfa,
  buildNfaFromAst,
  canonicalizeDfa,
  findCounterexample,
  generateAcceptedStrings,
  pickGenerationAlphabet,
  serializeDfaForVisualization,
  serializeNfaForVisualization,
} from "./services/automata.js";
import {
  explainAst,
  parseRegexToAst,
  serializeAstForVisualization,
  translateCustomPatternToNative,
} from "./services/regexParser.js";
import { enforceRegexSafety, assessRegexSafety } from "./services/redos.js";

const orderedFlags = (flags, supported) =>
  supported.filter((flag) => flags.includes(flag)).join("");

const normalizeFlags = (flags = "") => {
  if (typeof flags !== "string") {
    throw createHttpError("Regex flags must be provided as a string.");
  }

  const unique = new Set();
  for (const flag of flags) {
    if (!SUPPORTED_TEST_FLAGS.includes(flag)) {
      throw createHttpError(
        `Unsupported flag "${flag}". Supported flags are ${SUPPORTED_TEST_FLAGS.join(", ")}.`,
      );
    }
    if (unique.has(flag)) {
      throw createHttpError(`Duplicate regex flag "${flag}".`);
    }
    unique.add(flag);
  }

  return orderedFlags(flags, SUPPORTED_TEST_FLAGS);
};

const normalizePattern = (pattern, label = "Regex pattern") => {
  if (typeof pattern !== "string") {
    throw createHttpError(`${label} must be a string.`);
  }
  return pattern;
};

const normalizeText = (value, label) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw createHttpError(`${label} must be a string.`);
  }
  return value;
};

const automataNotesForFlags = (flags) => {
  const notes = [
    'This app uses "+" as the OR operator. Use "{1,}" for one-or-more repetition.',
    "Generation and equivalence use full-string language semantics rather than substring search.",
  ];

  if (flags.includes("g")) {
    notes.push('The "g" flag affects tester iteration only and is ignored by automata operations.');
  }

  return notes;
};

const buildSegments = (text, matches) => {
  if (!text) {
    return [];
  }

  if (matches.length === 0) {
    return [{ text, type: "plain" }];
  }

  const segments = [];
  let cursor = 0;

  for (const match of matches.slice(0, MAX_HIGHLIGHT_MATCHES)) {
    const [start, end] = match.indices;

    if (start > cursor) {
      segments.push({
        type: "plain",
        text: text.slice(cursor, start),
      });
    }

    if (end > start) {
      segments.push({
        type: "match",
        text: text.slice(start, end),
        matchIndex: match.matchIndex,
      });
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < text.length) {
    segments.push({
      type: "plain",
      text: text.slice(cursor),
    });
  }

  return segments;
};

const captureDetails = (match) => {
  const groups = [];
  const values = match.slice(1);
  const indices = match.indices?.slice(1) || [];

  for (let index = 0; index < values.length; index += 1) {
    const range = indices[index] ?? null;
    groups.push({
      group: index + 1,
      value: values[index] ?? null,
      displayValue:
        values[index] === undefined || values[index] === null
          ? null
          : escapeVisible(values[index]),
      start: range?.[0] ?? null,
      end: range?.[1] ?? null,
    });
  }

  return groups;
};

const buildMatchObject = (match, matchIndex) => {
  const [start, end] = match.indices[0];
  const namedGroupIndices = match.indices.groups || {};
  const namedGroups = match.groups || {};

  return {
    matchIndex,
    value: match[0],
    displayValue: escapeVisible(match[0]),
    index: start,
    lastIndex: end,
    indices: [start, end],
    groups: captureDetails(match),
    namedGroups: Object.entries(namedGroups).map(([name, value]) => ({
      name,
      value: value ?? null,
      displayValue: value === undefined || value === null ? null : escapeVisible(value),
      start: namedGroupIndices[name]?.[0] ?? null,
      end: namedGroupIndices[name]?.[1] ?? null,
    })),
  };
};

const buildTesterResult = (pattern, flags, testString) => {
  const runtimeFlags = orderedFlags(`${flags}d`, ["g", "i", "m", "s", "d"]);
  const nativePattern = translateCustomPatternToNative(pattern);
  let regex;
  try {
    regex = new RegExp(nativePattern, runtimeFlags);
  } catch (error) {
    throw createHttpError("Invalid regular expression.", { message: error.message });
  }

  const started = performance.now();
  const matches = [];

  if (flags.includes("g")) {
    let current = regex.exec(testString);
    while (current && matches.length < MAX_HIGHLIGHT_MATCHES) {
      matches.push(buildMatchObject(current, matches.length));
      if (current[0] === "") {
        regex.lastIndex += 1;
      }
      current = regex.exec(testString);
    }
  } else {
    const current = regex.exec(testString);
    if (current) {
      matches.push(buildMatchObject(current, 0));
    }
  }

  return {
    matched: matches.length > 0,
    totalMatches: matches.length,
    durationMs: Number((performance.now() - started).toFixed(2)),
    matches,
    segments: buildSegments(testString, matches),
  };
};

const buildAutomataBundle = (pattern, flags) => {
  const { ast } = parseRegexToAst(pattern, flags);
  const nfa = buildNfaFromAst(ast);
  const dfa = determinize(nfa, DEFAULT_ALPHABET);
  const minimized = minimizeDfa(dfa);

  return {
    ast,
    nfa,
    dfa,
    minimized,
  };
};

const displayGeneratedValue = (value) =>
  value === "" ? "(empty string)" : escapeVisible(value);

export const analyzePattern = (payload) => {
  const pattern = normalizePattern(payload.pattern ?? "");
  const flags = normalizeFlags(payload.flags ?? "");
  const testString = normalizeText(payload.testString ?? "", "Test string");
  const safety = enforceRegexSafety(pattern, testString);
  const tester = buildTesterResult(pattern, flags, testString);
  const warnings = [...safety.warnings];
  const notes = automataNotesForFlags(flags);
  let explanation = null;
  let visualization = null;
  let automata = {
    supported: false,
    reason: null,
    notes,
  };

  try {
    const bundle = buildAutomataBundle(pattern, flags);
    explanation = explainAst(bundle.ast);
    visualization = {
      parseTree: serializeAstForVisualization(bundle.ast),
      nfa: serializeNfaForVisualization(bundle.nfa),
      dfa: serializeDfaForVisualization(bundle.dfa, {
        kind: "dfa",
        prefix: "d",
      }),
      minimizedDfa: serializeDfaForVisualization(bundle.minimized, {
        kind: "minimized-dfa",
        prefix: "m",
      }),
    };
    automata = {
      supported: true,
      notes,
      nfaStates: bundle.nfa.states.size,
      dfaStates: bundle.dfa.states.size,
      minimizedStates: bundle.minimized.states.size,
    };
  } catch (error) {
    automata = {
      supported: false,
      reason: error.message,
      notes,
    };
    warnings.push(
      `Automata-based explanation, generation, or equivalence is unavailable for this pattern: ${error.message}`,
    );
  }

  return {
    pattern,
    flags,
    testString,
    safety,
    warnings,
    tester,
    explanation,
    visualization,
    automata,
  };
};

export const generateMatchingStrings = (payload) => {
  const pattern = normalizePattern(payload.pattern ?? "");
  const flags = normalizeFlags(payload.flags ?? "");
  const maxLength = Math.max(
    0,
    Math.min(Number(payload.maxLength ?? 8), MAX_GENERATION_LENGTH),
  );
  const count = Math.max(
    1,
    Math.min(Number(payload.count ?? 12), MAX_GENERATION_COUNT),
  );

  const safety = assessRegexSafety(pattern, "");
  if (!safety.safe) {
    throw createHttpError("Regex blocked for generation.", safety);
  }

  const bundle = buildAutomataBundle(pattern, flags);
  const generationAlphabet = pickGenerationAlphabet(bundle.ast);
  const values = generateAcceptedStrings(bundle.minimized, {
    count,
    maxLength,
    alphabet: generationAlphabet,
  });

  return {
    pattern,
    flags,
    notes: automataNotesForFlags(flags),
    warnings: safety.warnings,
    generation: {
      requestedCount: count,
      producedCount: values.length,
      maxLength,
      alphabetPreview: generationAlphabet.slice(0, 20).map(escapeVisible),
      strings: values.map((value) => ({
        raw: value,
        display: displayGeneratedValue(value),
      })),
    },
    automata: {
      supported: true,
      nfaStates: bundle.nfa.states.size,
      dfaStates: bundle.dfa.states.size,
      minimizedStates: bundle.minimized.states.size,
    },
  };
};

export const compareRegexes = (payload) => {
  const patternA = normalizePattern(payload.patternA ?? "", "Regex A");
  const patternB = normalizePattern(payload.patternB ?? "", "Regex B");
  const flagsA = normalizeFlags(payload.flagsA ?? "");
  const flagsB = normalizeFlags(payload.flagsB ?? "");
  const safetyA = assessRegexSafety(patternA, "");
  const safetyB = assessRegexSafety(patternB, "");

  if (!safetyA.safe) {
    throw createHttpError("Regex A was blocked for equivalence checking.", safetyA);
  }

  if (!safetyB.safe) {
    throw createHttpError("Regex B was blocked for equivalence checking.", safetyB);
  }

  const automataA = buildAutomataBundle(patternA, flagsA);
  const automataB = buildAutomataBundle(patternB, flagsB);
  const minimizedA = completeDfa(automataA.minimized);
  const minimizedB = completeDfa(automataB.minimized);
  const signatureA = canonicalizeDfa(minimizedA);
  const signatureB = canonicalizeDfa(minimizedB);
  const equivalent = signatureA === signatureB;
  const counterexample = equivalent ? null : findCounterexample(minimizedA, minimizedB);

  return {
    equivalent,
    counterexample: counterexample === null ? null : {
      raw: counterexample,
      display: displayGeneratedValue(counterexample),
    },
    warnings: Array.from(new Set([...safetyA.warnings, ...safetyB.warnings])),
    notes: Array.from(
      new Set([
        ...automataNotesForFlags(flagsA),
        ...automataNotesForFlags(flagsB),
        "Equivalence is computed over the supported ASCII-oriented alphabet used by the automata engine.",
      ]),
    ),
    diagnostics: {
      alphabetSize: DEFAULT_ALPHABET.length,
      patternA: {
        nfaStates: automataA.nfa.states.size,
        dfaStates: automataA.dfa.states.size,
        minimizedStates: automataA.minimized.states.size,
      },
      patternB: {
        nfaStates: automataB.nfa.states.size,
        dfaStates: automataB.dfa.states.size,
        minimizedStates: automataB.minimized.states.size,
      },
    },
  };
};

export const getRegexTemplates = () => REGEX_TEMPLATES;
