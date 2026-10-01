"use client";

import { useState } from "react";
import Link from "next/link";
import type { Category, Priority, Ticket } from "@/types/ticket";
import { PriorityBadge } from "@/components/tickets/PriorityBadge";
import {
  formatDataIssues,
  getCategoryLabel,
  getPlanLabel,
  getReviewReasonLabel,
} from "@/lib/tickets/labels";
import { formatDateTime, formatDateTimeFull } from "@/lib/tickets/time";
import { isAcceptable } from "@/lib/tickets/review";
import { ChangeReviewForm } from "./ChangeReviewForm";
import type { ChangeDraft } from "./useReviewQueue";

interface ReviewItemProps {
  ticket: Ticket;
  saving: boolean;
  error: string | null;
  draft: ChangeDraft | null;
  onAccept: (ticketId: string) => void;
  onChange: (
    ticketId: string,
    input: { category: Category; priority: Priority; reason: string }
  ) => void;
  subjectLinkRef?: (el: HTMLAnchorElement | null) => void;
}

export function ReviewItem({
  ticket,
  saving,
  error,
  draft,
  onAccept,
  onChange,
  subjectLinkRef,
}: ReviewItemProps) {
  // If there is an active draft or error from a failed submission, default change form open
  const [isChangeManuallyToggled, setIsChangeManuallyToggled] = useState<boolean | null>(null);
  const isChangeOpen = isChangeManuallyToggled ?? Boolean(draft || error);

  const acceptable = isAcceptable(ticket);

  // Check if enterprise floor will be applied on accept
  const willApplyEnterpriseFloor =
    ticket.plan === "enterprise" &&
    (ticket.priority === "P2" || ticket.priority === "P3");

  const hasIssues = ticket.dataIssues && ticket.dataIssues.length > 0;

  const isPriorityDifferent =
    Boolean(ticket.aiPriority && ticket.priority && ticket.aiPriority !== ticket.priority);

  // Collect warnings
  const warnings: string[] = [];
  if (ticket.reviewReason === "flagged_input") {
    warnings.push(
      "The AI flagged this ticket for suspicious content. Read it before accepting."
    );
  }
  if (ticket.reviewReason === "invalid_output" || !acceptable) {
    warnings.push(
      "The AI returned invalid values. Choose valid values with Change."
    );
  }
  if (ticket.reviewReason === "empty_ticket" || (!ticket.subject && !ticket.body)) {
    warnings.push("This ticket is empty.");
  }
  if (!ticket.plan) {
    warnings.push(
      "Plan is unknown, so the enterprise minimum priority can't be checked."
    );
  } else if (ticket.plan === "enterprise") {
    warnings.push("Enterprise tickets must stay at P1 or higher.");
  }

  const handleSaveChange = (input: {
    category: Category;
    priority: Priority;
    reason: string;
  }) => {
    onChange(ticket.id, input);
  };

  return (
    <li className="py-5 px-4 sm:px-6 border-b border-slate-200 last:border-b-0 space-y-3 bg-white">
      {/* Row Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-mono font-medium text-slate-700">{ticket.id}</span>
            <span className="text-slate-300">·</span>
            <span
              className={`px-1.5 py-0.5 rounded border text-[11px] font-medium ${
                ticket.plan === "enterprise"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : ticket.plan === "pro"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {getPlanLabel(ticket.plan)}
            </span>
            <span className="text-slate-300">·</span>
            <span
              className="tabular-nums"
              title={formatDateTimeFull(ticket.createdAt)}
            >
              {formatDateTime(ticket.createdAt)}
            </span>
          </div>

          <Link
            ref={subjectLinkRef}
            href={`/tickets/${encodeURIComponent(ticket.id)}`}
            dir="auto"
            title={(ticket.subject || "(No subject)").slice(0, 200)}
            className="block font-medium text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors motion-reduce:transition-none break-words line-clamp-2 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 [unicode-bidi:plaintext]"
          >
            {ticket.subject ? (
              ticket.subject
            ) : (
              <span className="italic text-slate-400 font-normal">
                (No subject)
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Subtle data issue note */}
      {hasIssues && (
        <p className="text-xs text-amber-800 bg-amber-50/70 border border-amber-200 rounded-[4px] p-2">
          {formatDataIssues(ticket.dataIssues)}
        </p>
      )}

      {/* AI Section as Definition List */}
      <div className="rounded-[6px] border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
          <div>
            <dt className="text-xs text-slate-500 font-medium">AI Category</dt>
            <dd className="text-slate-900 font-medium mt-0.5">
              {ticket.category ? (
                getCategoryLabel(ticket.category)
              ) : (
                <span className="italic text-slate-400 font-normal">
                  Invalid value
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-medium">AI Priority</dt>
            <dd className="mt-0.5">
              {isPriorityDifferent && ticket.aiPriority ? (
                <PriorityBadge priority={ticket.aiPriority} />
              ) : ticket.priority ? (
                <PriorityBadge priority={ticket.priority} />
              ) : (
                <span className="italic text-slate-400 font-normal">
                  Invalid value
                </span>
              )}
            </dd>
          </div>

          {isPriorityDifferent && (
            <div>
              <dt className="text-xs text-slate-500 font-medium">Final Priority</dt>
              <dd className="mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {ticket.priority} (manual)
                </span>
              </dd>
            </div>
          )}

          <div className={isPriorityDifferent && ticket.humanReview?.note ? "" : "md:col-span-2"}>
            <dt className="text-xs text-slate-500 font-medium">AI Reason</dt>
            <dd className="text-slate-700 text-xs mt-0.5">
              {ticket.reviewReason ? (
                getReviewReasonLabel(ticket.reviewReason)
              ) : (
                <span className="italic text-slate-400 font-normal">
                  No reason given
                </span>
              )}
            </dd>
          </div>

          {ticket.humanReview?.note && (
            <div>
              <dt className="text-xs text-slate-500 font-medium">Reason for change (human)</dt>
              <dd className="text-slate-700 text-xs mt-0.5 break-words">
                {ticket.humanReview.note}
              </dd>
            </div>
          )}

          <div className="md:col-span-2 pt-1 border-t border-slate-200/60">
            <dt className="text-xs text-slate-500 font-medium">AI Summary</dt>
            <dd
              dir="auto"
              className="text-slate-800 text-xs sm:text-sm mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [unicode-bidi:plaintext]"
            >
              {ticket.summary ? (
                ticket.summary
              ) : (
                <span className="italic text-slate-400 font-normal">
                  No summary
                </span>
              )}
            </dd>
          </div>
        </dl>

        {/* Small Muted Context Warnings */}
        {warnings.length > 0 && (
          <div className="pt-2 border-t border-slate-200/60 space-y-1">
            {warnings.map((w, idx) => (
              <p key={idx} className="text-xs text-slate-600">
                • {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Row Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <button
            type="button"
            onClick={() => onAccept(ticket.id)}
            disabled={!acceptable || saving}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-[6px] bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2 transition-colors cursor-pointer"
          >
            Accept AI answer
          </button>

          {!acceptable && (
            <span className="text-xs text-slate-500 italic">
              Invalid AI values — use Change
            </span>
          )}

          {acceptable && willApplyEnterpriseFloor && (
            <span className="text-xs text-amber-800 font-medium">
              Accepting will set priority to P1 (enterprise minimum).
            </span>
          )}
        </div>

        <button
          type="button"
          aria-expanded={isChangeOpen}
          aria-controls={`change-form-${ticket.id}`}
          onClick={() => setIsChangeManuallyToggled(!isChangeOpen)}
          disabled={saving}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-[6px] border border-sky-200 bg-sky-50 text-sky-800 text-sm font-medium hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2 transition-colors cursor-pointer"
        >
          {isChangeOpen ? "Close change form" : "Change…"}
        </button>
      </div>

      {/* Inline Change Form */}
      {isChangeOpen && (
        <div id={`change-form-${ticket.id}`}>
          <ChangeReviewForm
            ticket={ticket}
            draft={draft}
            saving={saving}
            onSave={handleSaveChange}
            onCancel={() => setIsChangeManuallyToggled(false)}
          />
        </div>
      )}
    </li>
  );
}
