import { builderSections } from "../utils/palette.js";

export default function BuilderPalette({ onInsert }) {
  return (
    <div className="space-y-4">
      {builderSections.map((section) => (
        <div key={section.title}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted/90">
            {section.title}
          </div>
          <div className="flex flex-wrap gap-2">
            {section.items.map((item) => (
              <button
                key={`${section.title}-${item.label}`}
                type="button"
                title={item.hint}
                onClick={() => onInsert(item.token)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-ink transition hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

