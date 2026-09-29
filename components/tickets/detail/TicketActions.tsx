import type { Ticket, TicketStatus } from "@/types/ticket";
import { getAgentName } from "@/data/agents";
import { getStatusActionState } from "@/lib/tickets/transitions";
import type { ActionFeedback, PendingActionType } from "./useTicketActions";

interface TicketActionsProps {
  ticket: Ticket;
  currentAgentId: string;
  pendingAction: PendingActionType;
  feedback: ActionFeedback | null;
  onClaim: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onRetriage: () => void;
}

export function TicketActions({
  ticket,
  currentAgentId,
  pendingAction,
  feedback,
  onClaim,
  onStatusChange,
  onRetriage,
}: TicketActionsProps) {
  const isPending = pendingAction !== null;
  const statusActions = getStatusActionState(ticket, currentAgentId);

  const isAssignedToMe = ticket.assignedTo === currentAgentId;
  const isAssignedToOther =
    ticket.assignedTo !== null && ticket.assignedTo !== currentAgentId;
  const isAssignedToUnknown = Boolean(ticket.assignedToUnknown);

  const canClaim =
    !ticket.assignedTo && !isAssignedToUnknown && ticket.status !== "closed";

  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
        {isPending && (
          <span className="text-xs text-slate-500 italic" role="status">
            Saving…
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Claim / Assignee Info */}
        <div>
          {canClaim ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={isPending}
              className="w-full min-h-[44px] px-4 py-2 rounded-[6px] bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 transition-colors cursor-pointer"
            >
              {pendingAction === "claim" ? "Claiming…" : "Claim ticket"}
            </button>
          ) : (
            <div className="text-sm text-slate-700 py-1">
              {isAssignedToMe ? (
                <span className="inline-flex items-center text-emerald-700 font-medium">
                  ✓ Assigned to you
                </span>
              ) : isAssignedToOther ? (
                <span className="text-slate-600">
                  Assigned to {getAgentName(ticket.assignedTo) ?? "another agent"}
                </span>
              ) : isAssignedToUnknown ? (
                <span
                  className="text-amber-800"
                  title={ticket.assignedToUnknown ?? undefined}
                >
                  Assigned to an unknown agent
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Status Transitions */}
        {ticket.status === "closed" ? (
          <p className="text-xs text-slate-500 italic">
            Closed tickets can&apos;t be changed.
          </p>
        ) : (
          <div className="space-y-2">
            {statusActions.map((action) => (
              <div key={action.targetStatus} className="space-y-1">
                <button
                  type="button"
                  onClick={() => onStatusChange(action.targetStatus)}
                  disabled={!action.enabled || isPending}
                  className="w-full min-h-[44px] px-4 py-2 rounded-[6px] border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 transition-colors cursor-pointer"
                >
                  {pendingAction === "status" ? "Updating…" : action.label}
                </button>
                {!action.enabled && action.reason && (
                  <p className="text-xs text-slate-500 px-0.5">{action.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Re-run AI */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onRetriage}
            disabled={isPending}
            className="w-full min-h-[44px] px-4 py-2 rounded-[6px] border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 transition-colors cursor-pointer"
          >
            {pendingAction === "retriage" ? "Re-running…" : "Re-run AI"}
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={`p-3 rounded-[6px] text-xs sm:text-sm border break-words ${
            feedback.kind === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : feedback.kind === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}
