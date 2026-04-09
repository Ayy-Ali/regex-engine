export const MAX_PATTERN_LENGTH = 120;
export const MAX_TEST_STRING_LENGTH = 500;
export const MAX_GENERATION_LENGTH = 12;
export const MAX_GENERATION_COUNT = 30;
export const MAX_HIGHLIGHT_MATCHES = 100;
export const SUPPORTED_TEST_FLAGS = ["g", "i", "m", "s"];
export const SUPPORTED_AUTOMATA_FLAGS = ["i", "s"];

const controlChars = ["\t", "\n", "\r"];
const printableAscii = Array.from({ length: 95 }, (_, index) =>
  String.fromCharCode(index + 32),
);

export const DEFAULT_ALPHABET = [...controlChars, ...printableAscii];
export const DIGIT_CHARS = "0123456789".split("");
export const LOWER_CHARS = "abcdefghijklmnopqrstuvwxyz".split("");
export const UPPER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const LETTER_CHARS = [...LOWER_CHARS, ...UPPER_CHARS];
export const WORD_CHARS = [...LETTER_CHARS, ...DIGIT_CHARS, "_"];
export const SPACE_CHARS = [" ", "\t", "\n", "\r"];
export const GENERATOR_FALLBACK_ALPHABET = [
  ...LOWER_CHARS,
  ...DIGIT_CHARS,
  ...UPPER_CHARS.slice(0, 6),
  "_",
  "-",
  ".",
  "@",
  "/",
  ":",
  " ",
];

export const REGEX_TEMPLATES = [
  {
    id: "email",
    label: "Email",
    description: "Basic email format with one @ and a domain.",
    pattern: "^[A-Za-z0-9._%+-]{1,}@[A-Za-z0-9.-]{1,}\\.[A-Za-z]{2,}$",
    flags: "",
    sample: "hello@example.com",
  },
  {
    id: "url",
    label: "URL",
    description: "HTTP or HTTPS URL with a simple host and optional path.",
    pattern: "^https?:\\/\\/[\\w.-]{1,}(?:\\/[\\w./-]*)?$",
    flags: "i",
    sample: "https://openai.com/docs",
  },
  {
    id: "phone",
    label: "Phone",
    description: "Loose phone matcher for common international formats.",
    pattern: "^\\+?[0-9]{1,3}[- .]?(?:\\(?[0-9]{2,4}\\)?[- .]?){2,4}[0-9]{2,4}$",
    flags: "",
    sample: "+1 (415) 555-0189",
  },
  {
    id: "slug",
    label: "Slug",
    description: "Lowercase slugs separated by hyphens.",
    pattern: "^[a-z0-9]{1,}(?:-[a-z0-9]{1,})*$",
    flags: "",
    sample: "regex-visualizer",
  },
];

export const escapeVisible = (value) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t");

export const createHttpError = (message, details, statusCode = 400) => {
  const error = new Error(message);
  error.details = details;
  error.statusCode = statusCode;
  return error;
};

export const dedupeChars = (chars) => [...new Set(chars)];
