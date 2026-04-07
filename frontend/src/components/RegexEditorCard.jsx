import FlagSelector from "./FlagSelector.jsx";

export default function RegexEditorCard({
  pattern,
  flags,
  testString,
  onPatternChange,
  onTestStringChange,
  onToggleFlag,
  onSave,
  onShare,
  patternInputRef,
  onSelectionChange,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Regular expression</label>
        <textarea
          ref={patternInputRef}
          value={pattern}
          onChange={(event) => onPatternChange(event.target.value)}
          onSelect={(event) =>
            onSelectionChange(event.target.selectionStart, event.target.selectionEnd)
          }
          onKeyUp={(event) =>
            onSelectionChange(event.currentTarget.selectionStart, event.currentTarget.selectionEnd)
          }
          rows={4}
          spellCheck={false}
          className="input-base resize-none font-mono text-[15px]"
          placeholder="Try ^[a-z]+\\d?$"
        />
        <FlagSelector value={flags} onToggle={onToggleFlag} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Test string</label>
        <textarea
          value={testString}
          onChange={(event) => onTestStringChange(event.target.value)}
          rows={5}
          spellCheck={false}
          className="input-base resize-none font-mono text-[15px]"
          placeholder="Type or paste text to see matches update live."
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-ink transition hover:border-accent/30 hover:bg-accent/10"
        >
          Save locally
        </button>
        <button
          type="button"
          onClick={onShare}
          className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/15"
        >
          Copy share link
        </button>
      </div>
    </div>
  );
}

