"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for developers only; never expose details or stack to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 break-words">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-600">
          An unexpected error occurred. Please try again or return to tickets.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[6px] bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Try again
        </button>
        <Link
          href="/tickets"
          className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[6px] border border-slate-200 bg-white text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Return to tickets
        </Link>
      </div>
    </div>
  );
}
