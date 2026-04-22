import { useState } from "react";

interface AiSearchBarProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export default function AiSearchBar({ onSubmit, disabled }: AiSearchBarProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 w-full max-w-md"
      data-ocid="ai_search.form"
    >
      <div className="flex items-center flex-1 border border-border bg-background focus-within:border-foreground/40 transition-colors">
        {/* Brain icon */}
        <span className="pl-2 pr-1 text-muted-foreground shrink-0" aria-hidden>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
            <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
            <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
            <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
            <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
            <path d="M6 18a4 4 0 0 1-1.967-.516" />
            <path d="M19.967 17.484A4 4 0 0 1 18 18" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask AI about your knowledge graphs..."
          disabled={disabled}
          className="flex-1 bg-transparent py-1.5 px-1 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-50"
          data-ocid="ai_search.input"
          aria-label="AI search query"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="border border-border px-3 py-1.5 font-mono text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        data-ocid="ai_search.submit_button"
      >
        Ask
      </button>
    </form>
  );
}
