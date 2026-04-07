const STATE_KEYS = [
  "pattern",
  "flags",
  "test",
  "tab",
  "patternB",
  "flagsB",
  "count",
  "maxLength",
];

export const readStateFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const state = {};

  for (const key of STATE_KEYS) {
    if (params.has(key)) {
      state[key] = params.get(key);
    }
  }

  return state;
};

export const writeStateToQuery = (nextState) => {
  const params = new URLSearchParams();

  for (const key of STATE_KEYS) {
    const value = nextState[key];
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  const url = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  window.history.replaceState(null, "", url);
  return window.location.href;
};
