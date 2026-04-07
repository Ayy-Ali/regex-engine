export default function MatchResults({ tester, warnings }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">Matches</div>
          <div className="mt-2 font-display text-2xl text-ink">{tester.totalMatches}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">Duration</div>
          <div className="mt-2 font-display text-2xl text-ink">{tester.durationMs}ms</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">Mode</div>
          <div className="mt-2 font-display text-lg text-ink">
            {tester.totalMatches > 1 ? "Multiple matches" : "Single match"}
          </div>
        </div>
      </div>

      {warnings?.length ? (
        <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-4 text-sm text-amber-100">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {tester.matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted">
            No matches were found with the current pattern and flags.
          </div>
        ) : (
          tester.matches.map((match) => (
            <article
              key={`${match.index}-${match.matchIndex}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">Match #{match.matchIndex + 1}</span>
                <span className="chip">
                  [{match.index}, {match.lastIndex})
                </span>
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950/40 p-3 font-mono text-sm text-accent">
                {match.displayValue}
              </pre>

              {match.groups.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {match.groups.map((group) => (
                    <div
                      key={`${match.matchIndex}-group-${group.group}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/35 p-3"
                    >
                      <div className="text-xs uppercase tracking-[0.16em] text-muted">
                        Group {group.group}
                      </div>
                      <div className="mt-2 font-mono text-sm text-ink">
                        {group.displayValue ?? "undefined"}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {group.start === null ? "No capture" : `[${group.start}, ${group.end})`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {match.namedGroups.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">
                    Named groups
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.namedGroups.map((group) => (
                      <span key={`${match.matchIndex}-${group.name}`} className="chip">
                        {group.name}: {group.displayValue ?? "undefined"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

