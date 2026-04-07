import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import Panel from "../components/Panel.jsx";
import RegexEditorCard from "../components/RegexEditorCard.jsx";
import BuilderPalette from "../components/BuilderPalette.jsx";
import TemplateStrip from "../components/TemplateStrip.jsx";
import SavedRegexes from "../components/SavedRegexes.jsx";
import TabNav from "../components/TabNav.jsx";
import MatchPreview from "../components/MatchPreview.jsx";
import MatchResults from "../components/MatchResults.jsx";
import ExplanationCard from "../components/ExplanationCard.jsx";
import VisualizationPanel from "../components/VisualizationPanel.jsx";
import GeneratorPanel from "../components/GeneratorPanel.jsx";
import EquivalencePanel from "../components/EquivalencePanel.jsx";
import {
  analyzeRegex,
  checkEquivalence,
  fetchTemplates,
  generateStrings,
} from "../utils/api.js";
import { readStateFromQuery, writeStateToQuery } from "../utils/share.js";

const DRAFT_KEY = "regex-visualizer-draft";
const SAVED_KEY = "regex-visualizer-saved";
const ORDERED_FLAGS = ["g", "i", "m", "s"];

const fallbackTemplates = [
  {
    id: "email",
    label: "Email",
    description: "Basic email validation.",
    pattern: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
    flags: "",
    sample: "hello@example.com",
  },
  {
    id: "url",
    label: "URL",
    description: "Simple URL matcher.",
    pattern: "^https?:\\/\\/[\\w.-]+(?:\\/[\\w./-]*)?$",
    flags: "i",
    sample: "https://openai.com/docs",
  },
  {
    id: "phone",
    label: "Phone",
    description: "Common international phone formats.",
    pattern: "^\\+?[0-9]{1,3}[- .]?(?:\\(?[0-9]{2,4}\\)?[- .]?){2,4}[0-9]{2,4}$",
    flags: "",
    sample: "+1 (415) 555-0189",
  },
];

const buildInitialState = () => {
  const defaults = {
    pattern: "a(b|c)*",
    flags: "g",
    testString: "abcb cab",
    activeTab: "test",
    patternB: "ab|ac",
    flagsB: "",
    count: "8",
    maxLength: "6",
  };

  let draft = {};
  try {
    draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    draft = {};
  }

  const query = readStateFromQuery();

  return {
    pattern: query.pattern ?? draft.pattern ?? defaults.pattern,
    flags: query.flags ?? draft.flags ?? defaults.flags,
    testString: query.test ?? draft.testString ?? defaults.testString,
    activeTab: query.tab ?? draft.activeTab ?? defaults.activeTab,
    patternB: query.patternB ?? draft.patternB ?? defaults.patternB,
    flagsB: query.flagsB ?? draft.flagsB ?? defaults.flagsB,
    count: query.count ?? draft.count ?? defaults.count,
    maxLength: query.maxLength ?? draft.maxLength ?? defaults.maxLength,
  };
};

const normalizeFlags = (flags) =>
  ORDERED_FLAGS.filter((flag) => flags.includes(flag)).join("");

const readSavedItems = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function HomePage() {
  const initialStateRef = useRef(buildInitialState());
  const patternInputRef = useRef(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const [pattern, setPattern] = useState(initialStateRef.current.pattern);
  const [flags, setFlags] = useState(initialStateRef.current.flags);
  const [testString, setTestString] = useState(initialStateRef.current.testString);
  const [activeTab, setActiveTab] = useState(initialStateRef.current.activeTab);
  const [patternB, setPatternB] = useState(initialStateRef.current.patternB);
  const [flagsB, setFlagsB] = useState(initialStateRef.current.flagsB);
  const [count, setCount] = useState(initialStateRef.current.count);
  const [maxLength, setMaxLength] = useState(initialStateRef.current.maxLength);
  const [templates, setTemplates] = useState(fallbackTemplates);
  const [savedItems, setSavedItems] = useState(readSavedItems);
  const [shareMessage, setShareMessage] = useState("");

  const [analysis, setAnalysis] = useState({
    loading: true,
    data: null,
    error: "",
  });
  const [generator, setGenerator] = useState({
    loading: false,
    data: null,
    error: "",
  });
  const [equivalence, setEquivalence] = useState({
    loading: false,
    data: null,
    error: "",
  });

  const deferredPattern = useDeferredValue(pattern);
  const deferredFlags = useDeferredValue(flags);
  const deferredTestString = useDeferredValue(testString);

  useEffect(() => {
    let mounted = true;

    fetchTemplates()
      .then((payload) => {
        if (mounted && Array.isArray(payload.templates) && payload.templates.length > 0) {
          setTemplates(payload.templates);
        }
      })
      .catch(() => {
        if (mounted) {
          setTemplates(fallbackTemplates);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAnalysis((current) => ({ ...current, loading: true, error: "" }));
      try {
        const payload = await analyzeRegex(
          {
            pattern: deferredPattern,
            flags: deferredFlags,
            testString: deferredTestString,
          },
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setAnalysis({
            loading: false,
            data: payload,
            error: "",
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setAnalysis({
            loading: false,
            data: null,
            error: error.message,
          });
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredPattern, deferredFlags, deferredTestString]);

  useEffect(() => {
    const snapshot = {
      pattern,
      flags,
      testString,
      activeTab,
      patternB,
      flagsB,
      count,
      maxLength,
    };

    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    writeStateToQuery({
      pattern,
      flags,
      test: testString,
      tab: activeTab,
      patternB,
      flagsB,
      count,
      maxLength,
    });
  }, [pattern, flags, testString, activeTab, patternB, flagsB, count, maxLength]);

  useEffect(() => {
    setGenerator((current) =>
      current.data || current.error ? { loading: false, data: null, error: "" } : current,
    );
  }, [pattern, flags, count, maxLength]);

  useEffect(() => {
    setEquivalence((current) =>
      current.data || current.error ? { loading: false, data: null, error: "" } : current,
    );
  }, [pattern, flags, patternB, flagsB]);

  const toggleFlag = (flag) => {
    setFlags((current) =>
      normalizeFlags(
        current.includes(flag)
          ? current.replace(flag, "")
          : `${current}${flag}`,
      ),
    );
  };

  const toggleFlagB = (flag) => {
    setFlagsB((current) =>
      normalizeFlags(
        current.includes(flag)
          ? current.replace(flag, "")
          : `${current}${flag}`,
      ),
    );
  };

  const handleSelectionChange = (start, end) => {
    selectionRef.current = { start, end };
  };

  const insertToken = (token) => {
    const input = patternInputRef.current;
    const start = input?.selectionStart ?? selectionRef.current.start ?? pattern.length;
    const end = input?.selectionEnd ?? selectionRef.current.end ?? pattern.length;

    let cursorOffset = token.length;
    if (token === "()") {
      cursorOffset = 1;
    }
    if (token === "(?:)") {
      cursorOffset = 3;
    }

    const nextPattern = `${pattern.slice(0, start)}${token}${pattern.slice(end)}`;
    setPattern(nextPattern);

    window.requestAnimationFrame(() => {
      input?.focus();
      const nextPosition = start + cursorOffset;
      input?.setSelectionRange(nextPosition, nextPosition);
      selectionRef.current = { start: nextPosition, end: nextPosition };
    });
  };

  const applyTemplate = (template) => {
    startTransition(() => {
      setPattern(template.pattern);
      setFlags(template.flags || "");
      setTestString(template.sample || "");
      setActiveTab("test");
    });
  };

  const saveCurrentRegex = () => {
    const item = {
      id: `${Date.now()}`,
      pattern,
      flags,
      testString,
      createdAt: new Date().toISOString(),
    };

    const nextItems = [
      item,
      ...savedItems.filter(
        (entry) => !(entry.pattern === pattern && entry.flags === flags && entry.testString === testString),
      ),
    ].slice(0, 8);

    setSavedItems(nextItems);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(nextItems));
    setShareMessage("Saved locally.");
    window.setTimeout(() => setShareMessage(""), 1800);
  };

  const loadSavedRegex = (item) => {
    startTransition(() => {
      setPattern(item.pattern);
      setFlags(item.flags || "");
      setTestString(item.testString || "");
      setActiveTab("test");
    });
  };

  const removeSavedRegex = (id) => {
    const nextItems = savedItems.filter((item) => item.id !== id);
    setSavedItems(nextItems);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(nextItems));
  };

  const copyShareLink = async () => {
    const url = writeStateToQuery({
      pattern,
      flags,
      test: testString,
      tab: activeTab,
      patternB,
      flagsB,
      count,
      maxLength,
    });

    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Share link copied.");
    } catch {
      setShareMessage("Share link is in the address bar.");
    }

    window.setTimeout(() => setShareMessage(""), 1800);
  };

  const runGeneration = async () => {
    setGenerator({ loading: true, data: null, error: "" });
    try {
      const payload = await generateStrings({
        pattern,
        flags,
        count: Number(count),
        maxLength: Number(maxLength),
      });
      setGenerator({ loading: false, data: payload, error: "" });
    } catch (error) {
      setGenerator({ loading: false, data: null, error: error.message });
    }
  };

  const runEquivalence = async () => {
    setEquivalence({ loading: true, data: null, error: "" });
    try {
      const payload = await checkEquivalence({
        patternA: pattern,
        flagsA: flags,
        patternB,
        flagsB,
      });
      setEquivalence({ loading: false, data: payload, error: "" });
    } catch (error) {
      setEquivalence({ loading: false, data: null, error: error.message });
    }
  };

  const tester = analysis.data?.tester ?? {
    matched: false,
    totalMatches: 0,
    durationMs: 0,
    matches: [],
    segments: [],
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Regex Visualizer & Equivalence Checker
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Build, test, explain, and compare regexes without leaving the page.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Use the guided palette to compose patterns, see live matches instantly, generate
              sample strings from the accepted language, and compare two expressions with an
              automata-based equivalence check.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip">Live tester</span>
            <span className="chip">Parse-tree visualizer</span>
            <span className="chip">Counterexamples</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          <Panel
            title="Templates"
            subtitle="Start from a beginner-friendly preset, then tweak it."
          >
            <TemplateStrip templates={templates} onApply={applyTemplate} />
          </Panel>

          <Panel
            title="Regex Builder"
            subtitle="Type directly or click tokens to insert syntax into the regex field."
          >
            <RegexEditorCard
              pattern={pattern}
              flags={flags}
              testString={testString}
              onPatternChange={setPattern}
              onTestStringChange={setTestString}
              onToggleFlag={toggleFlag}
              onSave={saveCurrentRegex}
              onShare={copyShareLink}
              patternInputRef={patternInputRef}
              onSelectionChange={handleSelectionChange}
            />
            {shareMessage ? (
              <p className="mt-3 text-sm text-accent">{shareMessage}</p>
            ) : null}
            <div className="mt-6 border-t border-white/10 pt-5">
              <BuilderPalette onInsert={insertToken} />
            </div>
          </Panel>

          <Panel
            title="Saved Regexes"
            subtitle="Persisted in your browser for quick local reuse."
          >
            <SavedRegexes
              items={savedItems}
              onLoad={loadSavedRegex}
              onRemove={removeSavedRegex}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Workspace"
            subtitle="Switch between testing, string generation, and equivalence checking."
            actions={<TabNav activeTab={activeTab} onChange={setActiveTab} />}
          >
            {analysis.loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
                Re-analyzing the current regex...
              </div>
            ) : null}

            {analysis.error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                {analysis.error}
              </div>
            ) : null}

            <div className="mt-5 space-y-5">
              {activeTab === "test" ? (
                <>
                  <MatchPreview
                    testString={testString}
                    segments={tester.segments}
                    matched={tester.matched}
                  />
                  <MatchResults
                    tester={tester}
                    warnings={analysis.data?.warnings || []}
                  />
                </>
              ) : null}

              {activeTab === "generate" ? (
                <GeneratorPanel
                  count={count}
                  maxLength={maxLength}
                  onCountChange={setCount}
                  onMaxLengthChange={setMaxLength}
                  onGenerate={runGeneration}
                  result={generator.data}
                  loading={generator.loading}
                  error={generator.error}
                />
              ) : null}

              {activeTab === "equivalence" ? (
                <EquivalencePanel
                  patternA={pattern}
                  flagsA={flags}
                  patternB={patternB}
                  flagsB={flagsB}
                  onPatternBChange={setPatternB}
                  onToggleFlagB={toggleFlagB}
                  onCheck={runEquivalence}
                  result={equivalence.data}
                  loading={equivalence.loading}
                  error={equivalence.error}
                />
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Regex Explanation"
            subtitle="Human-readable breakdown of the supported regular-language subset."
          >
            <ExplanationCard
              explanation={analysis.data?.explanation}
              automata={analysis.data?.automata}
            />
          </Panel>

          <Panel
            title="Visualization"
            subtitle="Parse-tree structure plus NFA/DFA sizing details."
          >
            <VisualizationPanel
              tree={analysis.data?.visualization}
              automata={analysis.data?.automata}
            />
          </Panel>

          <Panel
            title="Engine Notes"
            subtitle="What the backend is doing under the hood."
          >
            <div className="space-y-3 text-sm leading-6 text-muted">
              {(analysis.data?.automata?.notes || []).map((note) => (
                <p key={note}>{note}</p>
              ))}
              {generator.data?.notes?.map((note) => <p key={`gen-${note}`}>{note}</p>)}
              {equivalence.data?.notes?.map((note) => (
                <p key={`eq-${note}`}>{note}</p>
              ))}
              <p>
                Invalid regex syntax is reported immediately. Potential ReDoS patterns and oversized
                inputs are blocked before they reach the expensive parts of the pipeline.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
