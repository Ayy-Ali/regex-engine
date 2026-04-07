import { tabOptions } from "../utils/palette.js";

export default function TabNav({ activeTab, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabOptions.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${
            activeTab === tab.id ? "tab-active" : "tab-idle"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
