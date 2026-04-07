import {
  DEFAULT_ALPHABET,
  DIGIT_CHARS,
  LETTER_CHARS,
  LOWER_CHARS,
  SPACE_CHARS,
  SUPPORTED_AUTOMATA_FLAGS,
  UPPER_CHARS,
  WORD_CHARS,
  createHttpError,
  dedupeChars,
} from "./constants.js";

const cloneNode = (node) => {
  switch (node.type) {
    case "literal":
      return { ...node, chars: [...node.chars] };
    case "charset":
      return { ...node, chars: [...node.chars] };
    case "epsilon":
    case "anchorStart":
    case "anchorEnd":
      return { ...node };
    case "group":
      return { ...node, expression: cloneNode(node.expression) };
    case "sequence":
      return { ...node, elements: node.elements.map(cloneNode) };
    case "alternation":
      return { ...node, alternatives: node.alternatives.map(cloneNode) };
    case "repeat":
      return { ...node, expression: cloneNode(node.expression) };
    default:
      throw createHttpError(`Unknown node type "${node.type}".`);
  }
};

const addCaseVariants = (chars, caseInsensitive) => {
  if (!caseInsensitive) {
    return dedupeChars(chars);
  }

  const expanded = [...chars];

  for (const char of chars) {
    expanded.push(char.toLowerCase(), char.toUpperCase());
  }

  return dedupeChars(expanded);
};

const expandRange = (from, to, caseInsensitive) => {
  const start = from.charCodeAt(0);
  const end = to.charCodeAt(0);

  if (end < start) {
    throw createHttpError(`Invalid character range "${from}-${to}".`);
  }

  const chars = [];
  for (let code = start; code <= end; code += 1) {
    chars.push(String.fromCharCode(code));
  }

  return addCaseVariants(chars, caseInsensitive);
};

const escapeToChars = (code, { inClass = false, caseInsensitive = false, dotAll = false } = {}) => {
  switch (code) {
    case "d":
      return DIGIT_CHARS;
    case "D":
      return DEFAULT_ALPHABET.filter((char) => !DIGIT_CHARS.includes(char));
    case "w":
      return addCaseVariants(WORD_CHARS, caseInsensitive);
    case "W":
      return DEFAULT_ALPHABET.filter(
        (char) => !addCaseVariants(WORD_CHARS, caseInsensitive).includes(char),
      );
    case "s":
      return SPACE_CHARS;
    case "S":
      return DEFAULT_ALPHABET.filter((char) => !SPACE_CHARS.includes(char));
    case "t":
      return ["\t"];
    case "n":
      return ["\n"];
    case "r":
      return ["\r"];
    case "f":
      return ["\f"].filter((char) => DEFAULT_ALPHABET.includes(char));
    case "v":
      return ["\v"].filter((char) => DEFAULT_ALPHABET.includes(char));
    case "0":
      return ["\0"].filter((char) => DEFAULT_ALPHABET.includes(char));
    case ".":
      return ["."];
    case "\\":
      return ["\\"];
    case "[":
    case "]":
    case "(":
    case ")":
    case "{":
    case "}":
    case "|":
    case "*":
    case "+":
    case "?":
    case "^":
    case "$":
    case "-":
    case "/":
      return [code];
    default:
      if (!inClass && /[1-9]/.test(code)) {
        throw createHttpError(
          "Backreferences are not supported by the automata-based tools.",
        );
      }

      if (code === "p" || code === "P" || code === "k") {
        throw createHttpError(
          "Unicode properties and named backreferences are not supported by the automata-based tools.",
        );
      }

      return addCaseVariants([code], caseInsensitive);
  }
};

const dotChars = (dotAll) =>
  DEFAULT_ALPHABET.filter((char) => dotAll || char !== "\n");

class Parser {
  constructor(pattern, flags) {
    this.pattern = pattern;
    this.flags = flags;
    this.index = 0;
    this.caseInsensitive = flags.includes("i");
    this.dotAll = flags.includes("s");
  }

  parse() {
    const expression = this.parseAlternation();

    if (!this.isAtEnd()) {
      throw createHttpError(
        `Unexpected token "${this.peek()}" at position ${this.index}.`,
      );
    }

    return this.normalizeAnchors(expression);
  }

  parseAlternation() {
    const alternatives = [this.parseSequence()];

    while (this.peek() === "|") {
      this.consume();
      alternatives.push(this.parseSequence());
    }

    if (alternatives.length === 1) {
      return alternatives[0];
    }

    return {
      type: "alternation",
      alternatives,
    };
  }

  parseSequence() {
    const elements = [];

    while (!this.isAtEnd() && this.peek() !== ")" && this.peek() !== "|") {
      elements.push(this.parseQuantified());
    }

    if (elements.length === 0) {
      return { type: "epsilon" };
    }

    if (elements.length === 1) {
      return elements[0];
    }

    return {
      type: "sequence",
      elements,
    };
  }

  parseQuantified() {
    let expression = this.parsePrimary();

    if (this.isAtEnd()) {
      return expression;
    }

    const token = this.peek();

    if (token === "*" || token === "+" || token === "?") {
      this.consume();
      const greedy = this.peek() === "?" ? (this.consume(), false) : true;
      const mapping = {
        "*": { min: 0, max: Infinity },
        "+": { min: 1, max: Infinity },
        "?": { min: 0, max: 1 },
      };

      return {
        type: "repeat",
        expression,
        ...mapping[token],
        greedy,
      };
    }

    if (token === "{") {
      const quantifier = this.tryParseBracedQuantifier();
      if (quantifier) {
        expression = {
          type: "repeat",
          expression,
          ...quantifier,
        };
      }
    }

    return expression;
  }

  tryParseBracedQuantifier() {
    const checkpoint = this.index;

    if (this.consume() !== "{") {
      return null;
    }

    const minDigits = this.readDigits();
    if (minDigits.length === 0) {
      this.index = checkpoint;
      return null;
    }

    let min = Number(minDigits);
    let max = min;

    if (this.peek() === ",") {
      this.consume();
      const maxDigits = this.readDigits();
      max = maxDigits.length === 0 ? Infinity : Number(maxDigits);
    }

    if (this.peek() !== "}") {
      this.index = checkpoint;
      return null;
    }

    this.consume();

    if (max !== Infinity && max < min) {
      throw createHttpError("Quantifier upper bound cannot be smaller than the lower bound.");
    }

    const greedy = this.peek() === "?" ? (this.consume(), false) : true;
    return { min, max, greedy };
  }

  parsePrimary() {
    const token = this.peek();

    if (token === "(") {
      return this.parseGroup();
    }

    if (token === "[") {
      return this.parseCharacterClass();
    }

    if (token === "\\") {
      return this.parseEscape();
    }

    if (token === ".") {
      this.consume();
      return {
        type: "charset",
        chars: dotChars(this.dotAll),
        source: ".",
        kind: "dot",
      };
    }

    if (token === "^") {
      this.consume();
      return { type: "anchorStart" };
    }

    if (token === "$") {
      this.consume();
      return { type: "anchorEnd" };
    }

    if (token === ")") {
      throw createHttpError(`Unexpected ")" at position ${this.index}.`);
    }

    if (token === "{") {
      throw createHttpError(
        `Unexpected quantifier start "{" at position ${this.index}.`,
      );
    }

    const value = this.consume();
    return {
      type: "literal",
      value,
      chars: addCaseVariants([value], this.caseInsensitive),
    };
  }

  parseGroup() {
    this.consume();
    let capturing = true;

    if (this.peek() === "?") {
      this.consume();

      if (this.peek() === ":") {
        this.consume();
        capturing = false;
      } else {
        throw createHttpError(
          "Lookarounds, named groups, and inline modifiers are not supported by the automata-based tools.",
        );
      }
    }

    const expression = this.parseAlternation();

    if (this.peek() !== ")") {
      throw createHttpError('Unclosed group. Expected ")" before the end of the pattern.');
    }

    this.consume();

    return {
      type: "group",
      capturing,
      expression,
    };
  }

  parseCharacterClass() {
    this.consume();
    const negated = this.peek() === "^";
    if (negated) {
      this.consume();
    }

    const chars = [];
    let firstToken = true;

    while (!this.isAtEnd()) {
      if (this.peek() === "]" && !firstToken) {
        this.consume();
        const normalized = dedupeChars(chars);
        return {
          type: "charset",
          chars: negated
            ? DEFAULT_ALPHABET.filter((char) => !normalized.includes(char))
            : normalized,
          source: "class",
          negated,
          kind: "class",
        };
      }

      let left = this.parseClassAtom();

      if (
        this.peek() === "-" &&
        this.peekNext() !== "]" &&
        left.length === 1
      ) {
        this.consume();
        const right = this.parseClassAtom();

        if (right.length !== 1) {
          throw createHttpError("Character class ranges must use single-character endpoints.");
        }

        chars.push(...expandRange(left[0], right[0], this.caseInsensitive));
      } else {
        chars.push(...left);
      }

      firstToken = false;
    }

    throw createHttpError('Unclosed character class. Expected "]" before the end of the pattern.');
  }

  parseClassAtom() {
    if (this.isAtEnd()) {
      throw createHttpError("Unexpected end of pattern inside a character class.");
    }

    if (this.peek() === "\\") {
      this.consume();
      return escapeToChars(this.consume(), {
        inClass: true,
        caseInsensitive: this.caseInsensitive,
        dotAll: this.dotAll,
      });
    }

    return addCaseVariants([this.consume()], this.caseInsensitive);
  }

  parseEscape() {
    this.consume();

    if (this.isAtEnd()) {
      throw createHttpError("Dangling escape at the end of the pattern.");
    }

    const code = this.consume();
    const chars = escapeToChars(code, {
      caseInsensitive: this.caseInsensitive,
      dotAll: this.dotAll,
    });

    if (chars.length === 1 && !["d", "D", "w", "W", "s", "S"].includes(code)) {
      return {
        type: "literal",
        value: chars[0],
        chars,
        escaped: true,
      };
    }

    return {
      type: "charset",
      chars,
      source: `\\${code}`,
      kind: "escape",
    };
  }

  normalizeAnchors(expression) {
    if (expression.type !== "sequence") {
      return this.wrapBoundaryAnchors(expression);
    }

    return this.wrapBoundaryAnchors(expression);
  }

  wrapBoundaryAnchors(expression) {
    const nodes =
      expression.type === "sequence" ? [...expression.elements] : [expression];

    const startAnchored = nodes[0]?.type === "anchorStart";
    const endAnchored = nodes[nodes.length - 1]?.type === "anchorEnd";
    const trimmed = nodes.filter(
      (node, index) =>
        !(
          (index === 0 && node.type === "anchorStart") ||
          (index === nodes.length - 1 && node.type === "anchorEnd")
        ),
    );

    for (const node of trimmed) {
      this.assertNoInnerAnchors(node);
    }

    if (!startAnchored && !endAnchored) {
      return expression.type === "sequence"
        ? { ...expression, elements: trimmed }
        : expression;
    }

    if (startAnchored && endAnchored) {
      if (trimmed.length === 0) {
        return { type: "epsilon" };
      }
      if (trimmed.length === 1) {
        return trimmed[0];
      }
      return { type: "sequence", elements: trimmed };
    }

    throw createHttpError(
      'Anchors are supported only as a full-string pair ("^...$") in the automata-based tools.',
    );
  }

  assertNoInnerAnchors(node) {
    switch (node.type) {
      case "anchorStart":
      case "anchorEnd":
        throw createHttpError(
          'Anchors are supported only as a full-string pair ("^...$") in the automata-based tools.',
        );
      case "group":
        this.assertNoInnerAnchors(node.expression);
        return;
      case "repeat":
        this.assertNoInnerAnchors(node.expression);
        return;
      case "sequence":
        node.elements.forEach((child) => this.assertNoInnerAnchors(child));
        return;
      case "alternation":
        node.alternatives.forEach((child) => this.assertNoInnerAnchors(child));
        return;
      default:
        return;
    }
  }

  readDigits() {
    let value = "";
    while (!this.isAtEnd() && /\d/.test(this.peek())) {
      value += this.consume();
    }
    return value;
  }

  peek() {
    return this.pattern[this.index];
  }

  peekNext() {
    return this.pattern[this.index + 1];
  }

  consume() {
    const value = this.pattern[this.index];
    this.index += 1;
    return value;
  }

  isAtEnd() {
    return this.index >= this.pattern.length;
  }
}

export const parseRegexToAst = (pattern, flags = "") => {
  if (typeof pattern !== "string") {
    throw createHttpError("Regex pattern must be a string.");
  }

  for (const flag of flags) {
    if (!SUPPORTED_AUTOMATA_FLAGS.includes(flag) && flag !== "g" && flag !== "m") {
      throw createHttpError(`Unsupported regex flag "${flag}".`);
    }
  }

  if (flags.includes("m")) {
    throw createHttpError(
      'The automata-based tools do not support the "m" multiline flag.',
    );
  }

  if (/\\[bBAZzG]/.test(pattern)) {
    throw createHttpError(
      "Word boundaries and special zero-width assertions are not supported by the automata-based tools.",
    );
  }

  const parser = new Parser(pattern, flags);
  const ast = parser.parse();

  return {
    ast,
    cloneAst: () => cloneNode(ast),
  };
};

export const serializeAstForVisualization = (root) => {
  let id = 0;

  const visit = (node) => {
    const currentId = `node-${id += 1}`;

    switch (node.type) {
      case "literal":
        return {
          id: currentId,
          label: `Literal "${node.value}"`,
          type: node.type,
          children: [],
        };
      case "charset":
        return {
          id: currentId,
          label:
            node.kind === "dot"
              ? "Any char"
              : node.negated
                ? "Negated set"
                : "Char set",
          type: node.type,
          children: [],
          meta: {
            preview: node.chars.slice(0, 10).join(" "),
          },
        };
      case "epsilon":
        return { id: currentId, label: "Empty", type: node.type, children: [] };
      case "group":
        return {
          id: currentId,
          label: node.capturing ? "Capturing group" : "Non-capturing group",
          type: node.type,
          children: [visit(node.expression)],
        };
      case "sequence":
        return {
          id: currentId,
          label: "Sequence",
          type: node.type,
          children: node.elements.map(visit),
        };
      case "alternation":
        return {
          id: currentId,
          label: "Alternation",
          type: node.type,
          children: node.alternatives.map(visit),
        };
      case "repeat":
        return {
          id: currentId,
          label:
            node.max === Infinity
              ? `Repeat ${node.min}+`
              : `Repeat ${node.min}-${node.max}`,
          type: node.type,
          children: [visit(node.expression)],
          meta: {
            greedy: node.greedy,
          },
        };
      default:
        return {
          id: currentId,
          label: node.type,
          type: node.type,
          children: [],
        };
    }
  };

  return visit(root);
};

export const explainAst = (root) => {
  const steps = [];

  const quantifierLabel = (node) => {
    if (node.min === 0 && node.max === Infinity) {
      return "repeat 0 or more times";
    }
    if (node.min === 1 && node.max === Infinity) {
      return "repeat 1 or more times";
    }
    if (node.min === 0 && node.max === 1) {
      return "make optional";
    }
    if (node.max === Infinity) {
      return `repeat at least ${node.min} times`;
    }
    if (node.min === node.max) {
      return `repeat exactly ${node.min} times`;
    }
    return `repeat between ${node.min} and ${node.max} times`;
  };

  const visit = (node) => {
    switch (node.type) {
      case "literal":
        steps.push({
          label: `'${node.value}'`,
          detail: "Matches this exact literal character.",
        });
        return;
      case "charset":
        steps.push({
          label:
            node.kind === "dot"
              ? "."
              : node.source === "class"
                ? node.negated
                  ? "negated class"
                  : "character class"
                : node.source,
          detail:
            node.kind === "dot"
              ? "Matches any supported character."
              : `Matches one character from: ${node.chars
                  .slice(0, 8)
                  .map((char) => JSON.stringify(char))
                  .join(", ")}${node.chars.length > 8 ? ", ..." : ""}.`,
        });
        return;
      case "group":
        steps.push({
          label: node.capturing ? "( ... )" : "(?: ... )",
          detail: node.capturing
            ? "Groups the enclosed expression and captures it."
            : "Groups the enclosed expression without capturing it.",
        });
        visit(node.expression);
        return;
      case "sequence":
        node.elements.forEach(visit);
        return;
      case "alternation":
        steps.push({
          label: "|",
          detail: "Matches either the left branch or the right branch.",
        });
        node.alternatives.forEach(visit);
        return;
      case "repeat":
        steps.push({
          label: "quantifier",
          detail: `${quantifierLabel(node)}${node.greedy ? "" : " (lazy)."}`,
        });
        visit(node.expression);
        return;
      case "epsilon":
        steps.push({
          label: "empty",
          detail: "Can match the empty string at this point.",
        });
        return;
      default:
        return;
    }
  };

  visit(root);

  return {
    summary:
      steps.length === 0
        ? "This pattern matches only the empty string."
        : "Read top to bottom: literals, groups, choices, and quantifiers combine into one full-string matcher.",
    steps,
  };
};

export const collectPreferredAlphabet = (node) => {
  const chars = [];
  let needsFallback = false;

  const visit = (current) => {
    switch (current.type) {
      case "literal":
      case "charset":
        chars.push(...current.chars);
        if (current.kind === "dot" || current.negated) {
          needsFallback = true;
        }
        return;
      case "group":
      case "repeat":
        visit(current.expression);
        return;
      case "sequence":
        current.elements.forEach(visit);
        return;
      case "alternation":
        current.alternatives.forEach(visit);
        return;
      default:
        return;
    }
  };

  visit(node);

  return {
    chars: dedupeChars(chars),
    needsFallback,
  };
};

export const buildLiteralNode = (value) => ({
  type: "literal",
  value,
  chars: [value],
});

export const supportedCharacterHints = {
  lower: LOWER_CHARS,
  upper: UPPER_CHARS,
  letters: LETTER_CHARS,
  digits: DIGIT_CHARS,
};
