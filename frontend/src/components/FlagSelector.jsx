const FLAGS = [
  { key: "g", label: "Global", description: "Find all non-overlapping matches." },
  { key: "i", label: "Ignore case", description: "Treat uppercase and lowercase as equal." },
  { key: "m", label: "Multiline", description: "Make ^ and $ work line by line." },
  { key: "s", label: "Dot all", description: "Allow . to match newlines too." },
];

export default function FlagSelector({ value, onToggle, compact = false }) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-3"}`}>
      {FLAGS.map((flag) => {
        const active = value.includes(flag.key);
        return (
          <button
            key={flag.key}
            type="button"
            title={flag.description}
            onClick={() => onToggle(flag.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-white/10 bg-white/5 text-muted hover:border-accent/30 hover:text-ink"
            }`}
          >
            <span className="mr-1 font-display">{flag.key}</span>
            {compact ? null : flag.label}
          </button>
        );
      })}
    </div>
  );
}

