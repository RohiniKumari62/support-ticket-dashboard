export function EmptyTickets() {
  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-12 text-center">
      <h3 className="text-base font-medium text-slate-900">No tickets found</h3>
      <p className="mt-1 text-sm text-slate-500">
        There are currently no tickets matching your view.
      </p>
    </div>
  );
}
