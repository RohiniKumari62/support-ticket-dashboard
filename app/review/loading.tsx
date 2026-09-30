export default function ReviewQueueLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] animate-pulse" aria-busy="true">
      <div className="space-y-1">
        <div className="h-8 w-44 bg-slate-200 rounded" />
        <div className="h-4 w-64 bg-slate-100 rounded" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[6px] border border-slate-200 bg-white p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-100 rounded" />
            </div>
            <div className="h-12 w-full bg-slate-50 rounded" />
            <div className="flex gap-2">
              <div className="h-9 w-28 bg-slate-200 rounded" />
              <div className="h-9 w-24 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
