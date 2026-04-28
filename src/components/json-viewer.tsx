interface JsonViewerProps {
  value: unknown;
  title?: string;
}

export function JsonViewer({ value, title }: JsonViewerProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 shadow-sm">
      {title ? (
        <div className="border-b border-white/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          {title}
        </div>
      ) : null}
      <pre className="max-h-[520px] overflow-auto p-4 font-mono text-xs leading-5 text-zinc-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
