import FlagSelector from "./FlagSelector.jsx";

export default function EquivalencePanel({
  patternA,
  flagsA,
  patternB,
  flagsB,
  onPatternBChange,
  onToggleFlagB,
  onCheck,
  result,
  loading,
  error,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium text-ink">Regex A</div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950/35 p-3 font-mono text-sm text-ink">
            {patternA || "(empty string)"}
          </pre>
          <div className="mt-3 text-xs text-muted">Flags: {flagsA || "none"}</div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <label className="mb-2 block text-sm font-medium text-ink">Regex B</label>
          <textarea
            value={patternB}
            onChange={(event) => onPatternBChange(event.target.value)}
            rows={4}
            spellCheck={false}
            className="input-base resize-none font-mono text-[15px]"
            placeholder="Enter a second regex to compare."
          />
          <FlagSelector value={flagsB} onToggle={onToggleFlagB} compact />
        </div>
      </div>

      <button
        type="button"
        onClick={onCheck}
        className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/15"
      >
        {loading ? "Checking..." : "Check equivalence"}
      </button>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div
            className={`rounded-[24px] border p-5 ${
              result.equivalent
                ? "border-emerald-400/20 bg-emerald-500/10"
                : "border-rose-400/20 bg-rose-500/10"
            }`}
          >
            <div className="font-display text-xl text-ink">
              {result.equivalent ? "Equivalent" : "Not equivalent"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {result.equivalent
                ? "Both expressions accept the same language within the automata engine."
                : `A shortest counterexample is ${result.counterexample?.display ?? "(none)"}.`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Regex A states</div>
              <div className="mt-2 text-sm text-ink">
                NFA {result.diagnostics.patternA.nfaStates}, DFA {result.diagnostics.patternA.dfaStates},
                minimized {result.diagnostics.patternA.minimizedStates}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Regex B states</div>
              <div className="mt-2 text-sm text-ink">
                NFA {result.diagnostics.patternB.nfaStates}, DFA {result.diagnostics.patternB.dfaStates},
                minimized {result.diagnostics.patternB.minimizedStates}
              </div>
            </div>
          </div>

          {result.notes?.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
              {result.notes.join(" ")}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted">
          Compare two regexes as full-string languages and get a counterexample when they differ.
        </div>
      )}
    </div>
  );
}
