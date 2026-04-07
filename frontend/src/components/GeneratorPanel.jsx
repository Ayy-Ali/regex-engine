export default function GeneratorPanel({
  count,
  maxLength,
  onCountChange,
  onMaxLengthChange,
  onGenerate,
  result,
  loading,
  error,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Number of strings</span>
          <input
            type="number"
            min="1"
            max="30"
            value={count}
            onChange={(event) => onCountChange(event.target.value)}
            className="input-base"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Max length</span>
          <input
            type="number"
            min="0"
            max="12"
            value={maxLength}
            onChange={(event) => onMaxLengthChange(event.target.value)}
            className="input-base"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onGenerate}
            className="w-full rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/15"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Requested</div>
              <div className="mt-2 font-display text-2xl text-ink">
                {result.generation.requestedCount}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Produced</div>
              <div className="mt-2 font-display text-2xl text-ink">
                {result.generation.producedCount}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Max length</div>
              <div className="mt-2 font-display text-2xl text-ink">{result.generation.maxLength}</div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/30 p-4">
            <div className="mb-3 text-sm font-medium text-ink">Matching strings</div>
            <div className="flex flex-wrap gap-2">
              {result.generation.strings.length === 0 ? (
                <span className="text-sm text-muted">
                  No examples were found within the current length bound.
                </span>
              ) : (
                result.generation.strings.map((entry) => (
                  <span
                    key={`${entry.display}-${entry.raw}`}
                    className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 font-mono text-sm text-accent"
                  >
                    {entry.display}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
            Alphabet preview: {result.generation.alphabetPreview.join(" ")}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted">
          Use the current regex to generate example strings that fully match it.
        </div>
      )}
    </div>
  );
}

