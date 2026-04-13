# Regex Visualizer & Equivalence Checker

An interactive full-stack web app for building, testing, explaining, visualizing, and comparing regular expressions.

## What It Includes

- Live regex tester with `g`, `i`, `m`, and `s` flags
- Guided builder palette for common regex tokens
- Match highlighting with capture group indices
- Human-readable regex explanation panel
- Parse-tree visualization with NFA/DFA state counts
- String generator for supported regular-language syntax
- Regex equivalence checker with shortest counterexample when patterns differ
- Local save/load and shareable URL state
- Common starter templates for email, URL, phone, and slug patterns

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- Regex engine:
  - Custom syntax translated into native JavaScript regex for live testing
  - Custom AST + NFA/DFA pipeline for explanation, generation, visualization, and equivalence

## Project Structure

```text
backend/
  controllers/
  routes/
  services/
  regexEngine.js
frontend/
  src/
    components/
    pages/
    utils/
```

## Setup

```bash
npm install
```

## Run

In one terminal:

```bash
npm run dev
```

This starts:

- Backend on `http://localhost:4000`
- Frontend on `http://localhost:5173`
- In production, the Express server can also serve the built frontend from the same URL

## Deploy

Recommended beginner path: Render as a single web service.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ayy-Ali/regex-engine)

This repo includes a root-level `render.yaml` blueprint that tells Render to:

- install workspace dependencies with `npm install --include=dev`
- build the frontend with `npm run build`
- start the combined Express server with `npm start`
- use `/api/health` for health checks
- serve both the frontend and backend from the same Render URL

API behavior in production:

- the frontend already defaults to relative `/api` requests in [frontend/src/utils/api.js](C:/Users/Ayaan/OneDrive/Desktop/RegEx/frontend/src/utils/api.js)
- that means deployed requests go to the same origin as the site itself
- local development still works because Vite proxies `/api` to `http://localhost:4000` in [frontend/vite.config.js](C:/Users/Ayaan/OneDrive/Desktop/RegEx/frontend/vite.config.js)

After you click the button:

1. Sign in to Render.
2. Approve access to your GitHub repo if prompted.
3. Confirm the `regex-engine` web service.
4. Keep the free plan selected unless you want a paid instance.
5. Click `Apply`.

When the deploy finishes, Render gives you a public `onrender.com` URL.

Important note:
- Render's official docs say free web services are available, but they spin down after 15 minutes of idle time and can take about a minute to wake back up. Source: [Render free deploy docs](https://render.com/docs/free)
- Render deploys linked Git branches automatically after pushes. Source: [Render deploys docs](https://render.com/docs/deploys/)

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

The backend test runner performs focused sanity checks for:

- live analysis
- string generation
- equivalence detection
- counterexample production

## API Endpoints

- `GET /api/health`
- `GET /api/regex/templates`
- `POST /api/regex/analyze`
- `POST /api/regex/generate`
- `POST /api/regex/equivalence`

## Sample Test Cases

### Live tester

- Pattern: `a(b+c)*`
- Flags: `g`
- Test string: `abcb cab`

### String generator

- Pattern: `ab?`
- Expected examples: `a`, `ab`

### Equivalent regexes

- Regex A: `a(b+c)`
- Regex B: `ab+ac`
- Result: equivalent

### Non-equivalent regexes

- Regex A: `ab*`
- Regex B: `ab{1,}`
- Result: not equivalent
- Counterexample: `a`

## Safety Notes

- Invalid regex input is handled gracefully.
- Large inputs and common catastrophic-backtracking patterns are blocked before evaluation.
- Generation, explanation, visualization, and equivalence operate on a supported regular-language subset.
- The automata engine treats regexes as full-string languages and uses an ASCII-oriented alphabet.

## Supported Automata Subset

These features are supported by the custom automata engine:

- literals
- grouping and non-capturing groups
- alternation with `+` as the primary OR operator
- character classes and ranges
- `.`
- quantifiers: `*`, `?`, `{n}`, `{n,}`, `{n,m}`
- `^...$` full-string anchoring
- `i` and `s` flags

These advanced JavaScript regex features are intentionally limited to the live tester:

- lookarounds
- backreferences
- named groups in automata mode
- multiline automata semantics
- unicode property escapes

## Verification Notes

The implementation was verified locally with:

- `npm install`
- `npm test`
- `npm run build`
