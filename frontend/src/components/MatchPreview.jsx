const renderText = (segment) =>
  segment.text === "" ? (
    <span className="text-muted/60">∅</span>
  ) : (
    segment.text.replaceAll("\n", "\n")
  );

export default function MatchPreview({ testString, segments, matched }) {
  if (!testString) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/30 p-5 text-sm text-muted">
        Your test string will be highlighted here as matches appear.
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="chip">{matched ? "Match found" : "No match yet"}</span>
        <span className="text-xs text-muted">Live match preview</span>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[15px] leading-7 text-slate-200">
        {segments.map((segment, index) =>
          segment.type === "match" ? (
            <mark
              key={`${segment.matchIndex}-${index}`}
              className="rounded-md bg-accentWarm/30 px-0.5 py-0.5 text-amber-50"
            >
              {renderText(segment)}
            </mark>
          ) : (
            <span key={`plain-${index}`} className="text-slate-300">
              {renderText(segment)}
            </span>
          ),
        )}
      </pre>
    </div>
  );
}

