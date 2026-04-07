export default function SavedRegexes({ items, onLoad, onRemove }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted">
        Save a few patterns and they’ll appear here for quick reuse.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => onLoad(item)}
              className="min-w-0 text-left"
            >
              <div className="truncate font-mono text-sm text-ink">{item.pattern || "(empty)"}</div>
              <div className="mt-1 text-xs text-muted">flags: {item.flags || "none"}</div>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="text-xs text-muted transition hover:text-rose-300"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

