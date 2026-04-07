const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({
    ok: false,
    error: "Server returned a non-JSON response.",
  }));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
};

export const fetchTemplates = () => request("/regex/templates", { method: "GET" });

export const analyzeRegex = (body, signal) =>
  request("/regex/analyze", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });

export const generateStrings = (body) =>
  request("/regex/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const checkEquivalence = (body) =>
  request("/regex/equivalence", {
    method: "POST",
    body: JSON.stringify(body),
  });

