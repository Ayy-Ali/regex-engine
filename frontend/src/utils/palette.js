export const builderSections = [
  {
    title: "Characters",
    items: [
      { label: "a-z", token: "[a-z]", hint: "Lowercase letters." },
      { label: "A-Z", token: "[A-Z]", hint: "Uppercase letters." },
      { label: "0-9", token: "[0-9]", hint: "Digits from 0 through 9." },
      { label: "Literal", token: "a", hint: "Insert a literal character." },
      { label: "Any", token: ".", hint: "Match any character." },
    ],
  },
  {
    title: "Quantifiers",
    items: [
      { label: "*", token: "*", hint: "Repeat 0 or more times." },
      { label: "{1,}", token: "{1,}", hint: "Repeat 1 or more times." },
      { label: "?", token: "?", hint: "Make the previous token optional." },
      { label: "{n}", token: "{3}", hint: "Repeat exactly n times." },
      { label: "{n,m}", token: "{2,5}", hint: "Repeat between n and m times." },
    ],
  },
  {
    title: "Classes",
    items: [
      { label: "\\d", token: "\\d", hint: "Digit character." },
      { label: "\\w", token: "\\w", hint: "Word character." },
      { label: "\\s", token: "\\s", hint: "Whitespace character." },
      { label: "[abc]", token: "[abc]", hint: "One of the listed characters." },
      { label: "[^abc]", token: "[^abc]", hint: "Any character except the listed ones." },
    ],
  },
  {
    title: "Operators",
    items: [
      { label: "( )", token: "()", hint: "Create a capturing group." },
      { label: "(?: )", token: "(?:)", hint: "Create a non-capturing group." },
      { label: "+", token: "+", hint: "Alternative choice." },
      { label: "^", token: "^", hint: "Start anchor." },
      { label: "$", token: "$", hint: "End anchor." },
    ],
  },
];

export const tabOptions = [
  { id: "test", label: "Test" },
  { id: "generate", label: "Generate Strings" },
  { id: "equivalence", label: "Equivalence Checker" },
];
