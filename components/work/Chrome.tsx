"use client";
import type { CSSProperties, KeyboardEvent, RefObject } from "react";
import "./work.css";

/* Mode-specific chrome around the shared item list: the SYSTEM terminal and the TIMELINE axis. */

export function TerminalHead({
  query,
  shown,
  total,
  inputRef,
  onQuery,
  onEnter,
}: {
  query: string;
  shown: number;
  total: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onQuery: (q: string) => void;
  onEnter: () => void;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) onQuery("");
      else e.currentTarget.blur();
    }
  };

  return (
    <>
      <div className="wk-term-bar" aria-hidden data-fade>
        <span className="wk-term-dots">
          <i />
          <i />
          <i />
        </span>
        <span>akshat@os — ~/akshat/work — zsh</span>
        <span>
          {shown}/{total}
        </span>
      </div>
      <div className="wk-term-body" data-fade>
        <label className="wk-prompt">
          <span className="wk-prompt-path">~/akshat/work</span>
          <span aria-hidden>$</span>
          <span aria-hidden>ls -la | grep</span>
          <span className="wk-filter-wrap">
            <input
              ref={inputRef}
              className="wk-filter"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Filter projects. Enter opens the first match."
              aria-keyshortcuts="/"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              data-cursor="text"
            />
            {!query && <span className="wk-caret" aria-hidden />}
          </span>
        </label>
        <p className="wk-total" aria-live="polite">
          total {shown}
        </p>
      </div>
      <div className="wk-cols" aria-hidden data-fade>
        <span>#</span>
        <span>Perms</span>
        <span>Size</span>
        <span>Date</span>
        <span />
        <span>Name</span>
        <span>Category</span>
        <span>Status</span>
      </div>
    </>
  );
}

export function TerminalFoot({ query, shown }: { query: string; shown: number }) {
  return (
    <p className="wk-term-foot" data-fade>
      {shown === 0 ? (
        <span className="wk-term-error">ls: cannot access &apos;*{query}*&apos;: No such file or directory</span>
      ) : (
        <>
          {shown} {shown === 1 ? "directory" : "directories"} · ↵ on a row to cd into it
        </>
      )}
    </p>
  );
}

export interface Station {
  year: number;
  at: number;
}

export function Axis({ stations }: { stations: Station[] }) {
  return (
    <div className="wk-axis" aria-hidden data-fade>
      <span className="wk-rails" />
      {stations.map((st) => (
        <span key={st.year} className="wk-station" style={{ "--tx": st.at } as CSSProperties}>
          <span className="wk-station-board">{st.year}</span>
        </span>
      ))}
      <span className="wk-terminus">Now →</span>
    </div>
  );
}
