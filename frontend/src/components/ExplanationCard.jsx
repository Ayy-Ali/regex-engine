export default function ExplanationCard({ explanation, automata }) {
  if (!explanation) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted">
        {automata?.supported === false
          ? automata.reason
          : "A parsed explanation will appear here for supported regular-language syntax."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
        {explanation.summary}
      </p>
      <div className="space-y-3">
        {explanation.steps.map((step, index) => (
          <div
            key={`${step.label}-${index}`}
            className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
          >
            <div className="font-display text-sm font-semibold text-ink">{step.label}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{step.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

