export default function TicketsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      {/* Page Heading Skeleton */}
      <div>
        <div className="h-7 w-28 bg-slate-200 rounded-[4px]" />
        <div className="mt-1 h-4 w-72 bg-slate-100 rounded-[4px]" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-2">
        <div className="h-10 flex-1 bg-slate-100 rounded-[4px] border border-slate-200" />
        <div className="grid grid-cols-2 gap-2 md:flex md:items-end md:gap-2">
          <div className="h-10 w-full md:w-32 bg-slate-100 rounded-[4px] border border-slate-200" />
          <div className="h-10 w-full md:w-32 bg-slate-100 rounded-[4px] border border-slate-200" />
          <div className="h-10 w-full md:w-32 bg-slate-100 rounded-[4px] border border-slate-200" />
          <div className="h-10 w-full md:w-32 bg-slate-100 rounded-[4px] border border-slate-200" />
        </div>
      </div>

      {/* Result Count Skeleton */}
      <div className="h-4 w-40 bg-slate-100 rounded-[4px]" />

      {/* Desktop Table Skeleton (h-[44px] per row matching real rows) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-[6px] border border-slate-200 bg-white">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center" />
              <th className="py-2.5 px-3 min-w-[260px]">Subject</th>
              <th className="py-2.5 px-3">Plan</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Agent</th>
              <th className="py-2.5 px-3">Created</th>
              <th className="py-2.5 px-3">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="h-[44px]">
                <td className="py-2 px-3 w-10 text-center">
                  <div className="h-4 w-4 mx-auto bg-slate-200 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-4 w-12 bg-slate-100 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-5 w-12 bg-slate-100 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-5 w-14 bg-slate-100 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                </td>
                <td className="py-2 px-3">
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked List Skeleton (< md) */}
      <div className="block md:hidden rounded-[6px] border border-slate-200 bg-white divide-y divide-slate-200">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="py-3 px-3 space-y-2">
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="flex gap-2">
              <div className="h-4 w-12 bg-slate-100 rounded" />
              <div className="h-4 w-14 bg-slate-100 rounded" />
            </div>
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
