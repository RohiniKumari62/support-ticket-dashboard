import { getSafeUrl } from "@/lib/safe-url";
import type { TicketDataIssue } from "@/types/ticket";

interface TicketAttachmentProps {
  attachmentUrl: string | null | undefined;
  dataIssues?: TicketDataIssue[];
}

export function TicketAttachment({
  attachmentUrl,
  dataIssues = [],
}: TicketAttachmentProps) {
  const safeUrl = getSafeUrl(attachmentUrl);
  const hasUnsafeIssue = dataIssues.includes("unsafe_attachment_url");

  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-2">Attachment</h2>
      {hasUnsafeIssue ? (
        <div className="rounded-[4px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Attachment link blocked: it isn&apos;t a safe web address.
        </div>
      ) : safeUrl ? (
        <div>
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors motion-reduce:transition-none break-all focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {safeUrl}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">No attachment</p>
      )}
    </div>
  );
}
