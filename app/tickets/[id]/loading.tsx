export default function TicketDetailLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] animate-pulse" aria-busy="true">
      <div className="h-4 w-28 bg-slate-200 rounded" />
      <div className="space-y-2">
        <div className="h-8 w-2/3 bg-slate-200 rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-100 rounded" />
          <div className="h-5 w-16 bg-slate-100 rounded" />
          <div className="h-5 w-16 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-48 rounded-[6px] border border-slate-200 bg-white p-5" />
          <div className="h-32 rounded-[6px] border border-slate-200 bg-white p-5" />
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-[6px] border border-slate-200 bg-white p-5" />
          <div className="h-40 rounded-[6px] border border-slate-200 bg-white p-5" />
        </div>
      </div>
    </div>
  );
}
