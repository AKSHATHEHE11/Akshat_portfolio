/** Renders `line`, setting the first (case-insensitive) occurrence of `accent` in signal orange. */
export function Accent({ line, accent }: { line: string; accent: string }) {
  const at = line.toLowerCase().indexOf(accent.toLowerCase());
  if (at < 0) return <>{line}</>;
  return (
    <>
      {line.slice(0, at)}
      <span className="text-signal">{line.slice(at, at + accent.length)}</span>
      {line.slice(at + accent.length)}
    </>
  );
}
