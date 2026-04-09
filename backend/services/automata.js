import {
  DEFAULT_ALPHABET,
  DIGIT_CHARS,
  GENERATOR_FALLBACK_ALPHABET,
  LETTER_CHARS,
  LOWER_CHARS,
  SPACE_CHARS,
  UPPER_CHARS,
  WORD_CHARS,
  dedupeChars,
  escapeVisible,
} from "./constants.js";
import { collectPreferredAlphabet } from "./regexParser.js";

class NfaBuilder {
  constructor() {
    this.nextStateId = 0;
    this.transitions = [];
  }

  state() {
    const id = this.nextStateId;
    this.nextStateId += 1;
    return id;
  }

  epsilon(from, to) {
    this.transitions.push({ from, to, chars: null });
  }

  chars(from, to, chars) {
    this.transitions.push({ from, to, chars: dedupeChars(chars) });
  }
}

const epsilonFragment = (builder) => {
  const start = builder.state();
  const end = builder.state();
  builder.epsilon(start, end);
  return { start, end };
};

const concatFragments = (builder, fragments) => {
  if (fragments.length === 0) {
    return epsilonFragment(builder);
  }

  for (let index = 0; index < fragments.length - 1; index += 1) {
    builder.epsilon(fragments[index].end, fragments[index + 1].start);
  }

  return {
    start: fragments[0].start,
    end: fragments[fragments.length - 1].end,
  };
};

const buildRepetitionFragment = (builder, expression, min, max) => {
  const buildCopy = () => buildNfaFragment(builder, expression);

  if (min === 0 && max === 0) {
    return epsilonFragment(builder);
  }

  if (min === 0 && max === Infinity) {
    const start = builder.state();
    const end = builder.state();
    const body = buildCopy();
    builder.epsilon(start, end);
    builder.epsilon(start, body.start);
    builder.epsilon(body.end, body.start);
    builder.epsilon(body.end, end);
    return { start, end };
  }

  if (min === 1 && max === Infinity) {
    const first = buildCopy();
    const rest = buildRepetitionFragment(builder, expression, 0, Infinity);
    builder.epsilon(first.end, rest.start);
    return { start: first.start, end: rest.end };
  }

  const fragments = [];
  for (let count = 0; count < min; count += 1) {
    fragments.push(buildCopy());
  }

  let current = concatFragments(builder, fragments);

  if (max === Infinity) {
    const star = buildRepetitionFragment(builder, expression, 0, Infinity);
    builder.epsilon(current.end, star.start);
    return { start: current.start, end: star.end };
  }

  for (let count = 0; count < max - min; count += 1) {
    const optionalBody = buildCopy();
    const optionalEnd = builder.state();
    builder.epsilon(current.end, optionalBody.start);
    builder.epsilon(current.end, optionalEnd);
    builder.epsilon(optionalBody.end, optionalEnd);
    current = { start: current.start, end: optionalEnd };
  }

  return current;
};

export const buildNfaFragment = (builder, node) => {
  switch (node.type) {
    case "epsilon":
      return epsilonFragment(builder);
    case "literal":
    case "charset": {
      const start = builder.state();
      const end = builder.state();
      builder.chars(start, end, node.chars);
      return { start, end };
    }
    case "group":
      return buildNfaFragment(builder, node.expression);
    case "sequence": {
      const fragments = node.elements.map((element) =>
        buildNfaFragment(builder, element),
      );
      return concatFragments(builder, fragments);
    }
    case "alternation": {
      const start = builder.state();
      const end = builder.state();
      for (const alternative of node.alternatives) {
        const fragment = buildNfaFragment(builder, alternative);
        builder.epsilon(start, fragment.start);
        builder.epsilon(fragment.end, end);
      }
      return { start, end };
    }
    case "repeat":
      return buildRepetitionFragment(
        builder,
        node.expression,
        node.min,
        node.max,
      );
    default:
      throw new Error(`Unsupported AST node "${node.type}" in NFA construction.`);
  }
};

export const buildNfaFromAst = (ast) => {
  const builder = new NfaBuilder();
  const fragment = buildNfaFragment(builder, ast);

  return {
    start: fragment.start,
    accepting: new Set([fragment.end]),
    transitions: builder.transitions,
    states: new Set(
      [...Array.from({ length: builder.nextStateId }, (_, index) => index)],
    ),
  };
};

const epsilonClosure = (nfa, stateIds) => {
  const stack = [...stateIds];
  const closure = new Set(stateIds);

  while (stack.length > 0) {
    const state = stack.pop();
    for (const transition of nfa.transitions) {
      if (transition.from === state && transition.chars === null && !closure.has(transition.to)) {
        closure.add(transition.to);
        stack.push(transition.to);
      }
    }
  }

  return closure;
};

const move = (nfa, stateIds, char) => {
  const next = new Set();

  for (const transition of nfa.transitions) {
    if (
      transition.chars !== null &&
      stateIds.has(transition.from) &&
      transition.chars.includes(char)
    ) {
      next.add(transition.to);
    }
  }

  return next;
};

export const determinize = (nfa, alphabet = DEFAULT_ALPHABET) => {
  const startSet = epsilonClosure(nfa, new Set([nfa.start]));
  const keyFor = (states) => Array.from(states).sort((a, b) => a - b).join(",");
  const queue = [startSet];
  const stateMap = new Map([[keyFor(startSet), 0]]);
  const stateSets = [startSet];
  const transitions = { 0: {} };
  const accepting = new Set(
    [...startSet].some((state) => nfa.accepting.has(state)) ? [0] : [],
  );

  while (queue.length > 0) {
    const currentSet = queue.shift();
    const currentId = stateMap.get(keyFor(currentSet));
    transitions[currentId] ||= {};

    for (const char of alphabet) {
      const moved = move(nfa, currentSet, char);
      if (moved.size === 0) {
        continue;
      }

      const closed = epsilonClosure(nfa, moved);
      const key = keyFor(closed);

      if (!stateMap.has(key)) {
        const newId = stateSets.length;
        stateMap.set(key, newId);
        stateSets.push(closed);
        transitions[newId] = {};
        if ([...closed].some((state) => nfa.accepting.has(state))) {
          accepting.add(newId);
        }
        queue.push(closed);
      }

      transitions[currentId][char] = stateMap.get(key);
    }
  }

  return {
    start: 0,
    states: new Set(stateSets.map((_, index) => index)),
    accepting,
    transitions,
    alphabet: [...alphabet],
    subsets: stateSets.map((stateSet) => Array.from(stateSet).sort((a, b) => a - b)),
  };
};

export const completeDfa = (dfa) => {
  const alphabet = [...dfa.alphabet];
  const transitions = {};
  for (const state of dfa.states) {
    transitions[state] = { ...(dfa.transitions[state] || {}) };
  }

  let sink = null;
  const states = new Set(dfa.states);

  for (const state of states) {
    for (const char of alphabet) {
      if (transitions[state][char] === undefined) {
        if (sink === null) {
          sink = Math.max(...states) + 1;
          states.add(sink);
          transitions[sink] = {};
          for (const sinkChar of alphabet) {
            transitions[sink][sinkChar] = sink;
          }
        }
        transitions[state][char] = sink;
      }
    }
  }

  return {
    start: dfa.start,
    states,
    accepting: new Set(dfa.accepting),
    transitions,
    alphabet,
  };
};

export const minimizeDfa = (sourceDfa) => {
  const dfa = completeDfa(sourceDfa);
  const alphabet = [...dfa.alphabet];
  const accepting = Array.from(dfa.states).filter((state) => dfa.accepting.has(state));
  const rejecting = Array.from(dfa.states).filter((state) => !dfa.accepting.has(state));
  let partitions = [accepting, rejecting].filter((group) => group.length > 0);

  let changed = true;
  while (changed) {
    changed = false;
    const stateToPartition = new Map();

    partitions.forEach((group, index) => {
      group.forEach((state) => stateToPartition.set(state, index));
    });

    const nextPartitions = [];

    for (const group of partitions) {
      const buckets = new Map();

      for (const state of group) {
        const signature = alphabet
          .map((char) => stateToPartition.get(dfa.transitions[state][char]))
          .join("|");

        if (!buckets.has(signature)) {
          buckets.set(signature, []);
        }

        buckets.get(signature).push(state);
      }

      if (buckets.size > 1) {
        changed = true;
      }

      nextPartitions.push(...buckets.values());
    }

    partitions = nextPartitions;
  }

  const stateToPartition = new Map();
  partitions.forEach((group, index) => {
    group.forEach((state) => stateToPartition.set(state, index));
  });

  const transitions = {};
  const states = new Set();
  const acceptingPartitions = new Set();

  partitions.forEach((group, index) => {
    states.add(index);
    const representative = group[0];
    transitions[index] = {};
    for (const char of alphabet) {
      transitions[index][char] = stateToPartition.get(
        dfa.transitions[representative][char],
      );
    }
    if (group.some((state) => dfa.accepting.has(state))) {
      acceptingPartitions.add(index);
    }
  });

  return {
    start: stateToPartition.get(dfa.start),
    states,
    accepting: acceptingPartitions,
    transitions,
    alphabet,
  };
};

export const canonicalizeDfa = (dfa) => {
  const orderedStates = [];
  const visited = new Set([dfa.start]);
  const queue = [dfa.start];
  const canonicalIds = new Map([[dfa.start, 0]]);

  while (queue.length > 0) {
    const state = queue.shift();
    orderedStates.push(state);

    for (const char of dfa.alphabet) {
      const target = dfa.transitions[state][char];
      if (!visited.has(target)) {
        visited.add(target);
        canonicalIds.set(target, canonicalIds.size);
        queue.push(target);
      }
    }
  }

  return JSON.stringify(
    orderedStates.map((state) => ({
      id: canonicalIds.get(state),
      accepting: dfa.accepting.has(state),
      transitions: dfa.alphabet.map((char) => canonicalIds.get(dfa.transitions[state][char])),
    })),
  );
};

export const findCounterexample = (dfaA, dfaB) => {
  const queue = [{ a: dfaA.start, b: dfaB.start, word: "" }];
  const visited = new Set([`${dfaA.start}|${dfaB.start}`]);

  while (queue.length > 0) {
    const current = queue.shift();
    const acceptsA = dfaA.accepting.has(current.a);
    const acceptsB = dfaB.accepting.has(current.b);

    if (acceptsA !== acceptsB) {
      return current.word;
    }

    for (const char of dfaA.alphabet) {
      const nextA = dfaA.transitions[current.a][char];
      const nextB = dfaB.transitions[current.b][char];
      const key = `${nextA}|${nextB}`;

      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          a: nextA,
          b: nextB,
          word: current.word + char,
        });
      }
    }
  }

  return null;
};

const reverseTransitions = (dfa) => {
  const reverse = {};

  for (const state of dfa.states) {
    reverse[state] = [];
  }

  for (const state of dfa.states) {
    for (const char of dfa.alphabet) {
      const target = dfa.transitions[state][char];
      reverse[target].push({ from: state, char });
    }
  }

  return reverse;
};

const shortestDistanceToAccepting = (dfa) => {
  const reverse = reverseTransitions(dfa);
  const queue = [...dfa.accepting];
  const distance = new Map(queue.map((state) => [state, 0]));

  while (queue.length > 0) {
    const state = queue.shift();
    for (const edge of reverse[state]) {
      if (!distance.has(edge.from)) {
        distance.set(edge.from, distance.get(state) + 1);
        queue.push(edge.from);
      }
    }
  }

  return distance;
};

const sameCharSet = (chars, expected) =>
  chars.length === expected.length && expected.every((char) => chars.includes(char));

const sortChars = (chars) =>
  dedupeChars(chars).sort((left, right) => left.charCodeAt(0) - right.charCodeAt(0));

const formatChar = (char) => {
  if (char === " ") {
    return "space";
  }

  return escapeVisible(char);
};

const summarizeCharSet = (chars) => {
  if (chars === null) {
    return "epsilon";
  }

  const normalized = sortChars(chars);

  if (normalized.length === 0) {
    return "empty";
  }

  if (sameCharSet(normalized, DIGIT_CHARS)) {
    return "\\d";
  }

  if (sameCharSet(normalized, SPACE_CHARS)) {
    return "\\s";
  }

  if (sameCharSet(normalized, WORD_CHARS)) {
    return "\\w";
  }

  if (sameCharSet(normalized, LOWER_CHARS)) {
    return "[a-z]";
  }

  if (sameCharSet(normalized, UPPER_CHARS)) {
    return "[A-Z]";
  }

  if (sameCharSet(normalized, LETTER_CHARS)) {
    return "[A-Za-z]";
  }

  if (normalized.length === DEFAULT_ALPHABET.length) {
    return "ANY";
  }

  if (
    normalized.length === DEFAULT_ALPHABET.length - 1 &&
    !normalized.includes("\n")
  ) {
    return "ANY except \\n";
  }

  const ranges = [];
  let start = normalized[0];
  let previous = normalized[0];

  const flush = () => {
    const span = previous.charCodeAt(0) - start.charCodeAt(0) + 1;
    if (span >= 3) {
      ranges.push(`${formatChar(start)}-${formatChar(previous)}`);
      return;
    }

    let currentCode = start.charCodeAt(0);
    while (currentCode <= previous.charCodeAt(0)) {
      ranges.push(formatChar(String.fromCharCode(currentCode)));
      currentCode += 1;
    }
  };

  for (let index = 1; index < normalized.length; index += 1) {
    const current = normalized[index];
    if (current.charCodeAt(0) === previous.charCodeAt(0) + 1) {
      previous = current;
      continue;
    }

    flush();
    start = current;
    previous = current;
  }

  flush();

  const label = ranges.join(", ");
  if (label.length <= 34) {
    return label;
  }

  return `${ranges.slice(0, 4).join(", ")} ... (${normalized.length} chars)`;
};

const collectGraphNodes = (states, start, accepting, prefix, subsets) =>
  Array.from(states)
    .sort((left, right) => left - right)
    .map((state) => ({
      id: `${prefix}-${state}`,
      state,
      label: `${prefix.toUpperCase()} ${state}`,
      isStart: state === start,
      isAccepting: accepting.has(state),
      subset: subsets?.[state] || null,
    }));

const mergeGraphEdges = (edges) => {
  const grouped = new Map();

  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    if (!grouped.has(key)) {
      grouped.set(key, { ...edge, labels: [] });
    }

    grouped.get(key).labels.push(edge.label);
  }

  return Array.from(grouped.values()).map((edge) => ({
    from: edge.from,
    to: edge.to,
    label: dedupeChars(edge.labels).join(", "),
  }));
};

export const serializeNfaForVisualization = (nfa) => ({
  kind: "nfa",
  nodes: collectGraphNodes(nfa.states, nfa.start, nfa.accepting, "q"),
  edges: mergeGraphEdges(
    nfa.transitions.map((transition) => ({
      from: `q-${transition.from}`,
      to: `q-${transition.to}`,
      label: summarizeCharSet(transition.chars),
    })),
  ),
});

export const serializeDfaForVisualization = (dfa, options = {}) => ({
  kind: options.kind || "dfa",
  nodes: collectGraphNodes(
    dfa.states,
    dfa.start,
    dfa.accepting,
    options.prefix || "d",
    dfa.subsets,
  ),
  edges: mergeGraphEdges(
    Array.from(dfa.states).flatMap((state) => {
      const outgoing = dfa.transitions[state] || {};
      const byTarget = new Map();

      for (const [char, target] of Object.entries(outgoing)) {
        if (!byTarget.has(target)) {
          byTarget.set(target, []);
        }
        byTarget.get(target).push(char);
      }

      return Array.from(byTarget.entries()).map(([target, chars]) => ({
        from: `${options.prefix || "d"}-${state}`,
        to: `${options.prefix || "d"}-${target}`,
        label: summarizeCharSet(chars),
      }));
    }),
  ),
});

export const pickGenerationAlphabet = (ast) => {
  const { chars, needsFallback } = collectPreferredAlphabet(ast);
  const combined = needsFallback
    ? [...chars, ...GENERATOR_FALLBACK_ALPHABET]
    : chars;

  return dedupeChars(combined).filter((char) => DEFAULT_ALPHABET.includes(char));
};

export const generateAcceptedStrings = (dfaSource, options = {}) => {
  const dfa = completeDfa(dfaSource);
  const count = Math.max(1, Math.min(options.count || 10, 50));
  const maxLength = Math.max(0, Math.min(options.maxLength || 8, 20));
  const alphabet =
    options.alphabet && options.alphabet.length > 0
      ? options.alphabet
      : dfa.alphabet;

  const distances = shortestDistanceToAccepting(dfa);
  const queue = [{ state: dfa.start, value: "" }];
  const results = [];
  let expanded = 0;

  if (dfa.accepting.has(dfa.start)) {
    results.push("");
  }

  while (queue.length > 0 && results.length < count && expanded < 25000) {
    const current = queue.shift();
    expanded += 1;

    if (current.value.length >= maxLength) {
      continue;
    }

    for (const char of alphabet) {
      const nextState = dfa.transitions[current.state][char];
      const nextValue = current.value + char;
      const remaining = distances.get(nextState);

      if (remaining === undefined || nextValue.length + remaining > maxLength) {
        continue;
      }

      if (dfa.accepting.has(nextState) && !results.includes(nextValue)) {
        results.push(nextValue);
        if (results.length >= count) {
          break;
        }
      }

      queue.push({ state: nextState, value: nextValue });
    }
  }

  return results;
};
