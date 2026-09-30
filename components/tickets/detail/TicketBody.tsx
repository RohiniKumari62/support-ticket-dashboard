interface TicketBodyProps {
  body: string | null | undefined;
}

export function TicketBody({ body }: TicketBodyProps) {
  const hasContent = Boolean(body && body.trim().length > 0);

  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-2">Description</h2>
      {hasContent ? (
        <div
          dir="auto"
          className="text-sm text-slate-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [unicode-bidi:plaintext] max-w-full font-sans"
        >
          {body}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">(No body)</p>
      )}
    </div>
  );
}
