export default function TemplateStrip({ templates, onApply }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onApply(template)}
          className="min-w-[180px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-accent/40 hover:bg-accent/5"
        >
          <div className="font-display text-sm font-semibold text-ink">{template.label}</div>
          <p className="mt-1 text-xs leading-5 text-muted">{template.description}</p>
        </button>
      ))}
    </div>
  );
}

