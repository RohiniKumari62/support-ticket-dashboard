import type { Ticket } from "@/types/ticket";
import {
  getCategoryLabel,
  getPriorityLabel,
  getReviewReasonLabel,
  getTriageDecisionLabel,
} from "@/lib/tickets/labels";

interface TicketAiSectionProps {
  ticket: Ticket;
}

export function TicketAiSection({ ticket }: TicketAiSectionProps) {
  const isPriorityDifferent =
    Boolean(ticket.aiPriority && ticket.priority && ticket.aiPriority !== ticket.priority);

  let priorityDifferenceReason = "";
  if (isPriorityDifferent) {
    if (ticket.reviewReason === "rule_adjusted" && ticket.plan === "enterprise") {
      priorityDifferenceReason =
        "Raised to P1 because enterprise tickets are always at least P1";
    } else if (ticket.reviewReason) {
      priorityDifferenceReason = getReviewReasonLabel(ticket.reviewReason);
    } else {
      priorityDifferenceReason = "Changed after the AI's suggestion";
    }
  }

  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-900">AI Triage Details</h2>
        {ticket.triageDecision === "manual_review" && (
          <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-[4px] px-2.5 py-1">
            Waiting for AI review
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500 font-medium">Triage Decision</dt>
          <dd className="text-slate-900 mt-0.5">
            {getTriageDecisionLabel(ticket.triageDecision)}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-slate-500 font-medium">Suggested Category</dt>
          <dd className="text-slate-900 mt-0.5">
            {getCategoryLabel(ticket.category)}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-500 font-medium">Priority Analysis</dt>
          <dd className="text-slate-900 mt-0.5 space-y-1">
            {isPriorityDifferent ? (
              <div>
                <p className="font-medium text-slate-900">
                  Final priority {getPriorityLabel(ticket.priority)} · AI suggested{" "}
                  {getPriorityLabel(ticket.aiPriority)}
                </p>
                {priorityDifferenceReason && (
                  <p className="text-xs text-slate-600">{priorityDifferenceReason}</p>
                )}
              </div>
            ) : (
              <p>{getPriorityLabel(ticket.priority)}</p>
            )}
          </dd>
        </div>

        {ticket.reviewReason && !isPriorityDifferent && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500 font-medium">Review Reason</dt>
            <dd className="text-slate-900 mt-0.5 text-xs">
              {getReviewReasonLabel(ticket.reviewReason)}
            </dd>
          </div>
        )}

        <div className="sm:col-span-2 pt-2 border-t border-slate-100">
          <dt className="text-xs text-slate-500 font-medium">AI Summary</dt>
          <dd className="text-slate-800 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm">
            {ticket.summary ? ticket.summary : <span className="italic text-slate-500">No summary</span>}
          </dd>
        </div>
      </dl>
    </div>
  );
}
