import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 break-words">
          Page not found
        </h1>
        <p className="text-sm text-slate-600">
          The requested page could not be found or does not exist.
        </p>
      </div>

      <div>
        <Link
          href="/tickets"
          className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[6px] bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Return to tickets
        </Link>
      </div>
    </div>
  );
}
