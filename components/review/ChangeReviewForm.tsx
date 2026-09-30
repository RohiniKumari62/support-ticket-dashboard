"use client";

import { useRef, useState } from "react";
import type { Category, Priority, Ticket } from "@/types/ticket";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
} from "@/lib/tickets/labels";
import {
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  validateReviewChange,
} from "@/lib/tickets/review";
import type { ChangeDraft } from "./useReviewQueue";

interface ChangeReviewFormProps {
  ticket: Ticket;
  draft: ChangeDraft | null;
  saving: boolean;
  onSave: (input: { category: Category; priority: Priority; reason: string }) => void;
  onCancel: () => void;
}

const CATEGORIES: Category[] = [
  "billing",
  "bug",
  "account_access",
  "feature_request",
  "other",
];

const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

export function ChangeReviewForm({
  ticket,
  draft,
  saving,
  onSave,
  onCancel,
}: ChangeReviewFormProps) {
  // Initialize from draft or ticket's current values (empty string if invalid/null)
  const [category, setCategory] = useState<Category | "">(() => {
    if (draft?.category !== undefined && draft?.category !== null) {
      return draft.category;
    }
    return ticket.category ?? "";
  });

  const [priority, setPriority] = useState<Priority | "">(() => {
    if (draft?.priority !== undefined && draft?.priority !== null) {
      return draft.priority;
    }
    return ticket.priority ?? "";
  });

  const [reason, setReason] = useState<string>(() => draft?.reason ?? "");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const categorySelectRef = useRef<HTMLSelectElement>(null);
  const prioritySelectRef = useRef<HTMLSelectElement>(null);
  const reasonTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isEnterprise = ticket.plan === "enterprise";

  // Re-run validation on change if submit was already attempted
  const validationResult = hasAttemptedSubmit
    ? validateReviewChange(ticket, {
        category,
        priority,
        reason,
      })
    : null;

  const errors = validationResult && !validationResult.ok ? validationResult.errors : {};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    const res = validateReviewChange(ticket, {
      category,
      priority,
      reason,
    });

    if (!res.ok) {
      // Move focus to first invalid field
      if (res.errors.category && categorySelectRef.current) {
        categorySelectRef.current.focus();
      } else if (res.errors.priority && prioritySelectRef.current) {
        prioritySelectRef.current.focus();
      } else if (res.errors.reason && reasonTextareaRef.current) {
        reasonTextareaRef.current.focus();
      }
      return;
    }

    onSave({
      category: res.value.category,
      priority: res.value.priority,
      reason: res.value.reason,
    });
  };

  const trimmedLength = reason.trim().length;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 rounded-[6px] border border-slate-200 bg-slate-50/70 p-4 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category Field */}
        <div>
          <label
            htmlFor={`category-${ticket.id}`}
            className="block text-xs font-semibold text-slate-800 mb-1"
          >
            Category
          </label>
          <select
            id={`category-${ticket.id}`}
            ref={categorySelectRef}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            disabled={saving}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? `category-err-${ticket.id}` : undefined}
            className="w-full h-10 px-3 rounded-[6px] border border-slate-300 bg-white text-base sm:text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          >
            {(!ticket.category || category === "") && (
              <option value="">Select category…</option>
            )}
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          {errors.category && (
            <p
              id={`category-err-${ticket.id}`}
              className="mt-1 text-xs text-red-600 font-medium"
            >
              {errors.category}
            </p>
          )}
        </div>

        {/* Priority Field */}
        <div>
          <label
            htmlFor={`priority-${ticket.id}`}
            className="block text-xs font-semibold text-slate-800 mb-1"
          >
            Priority
          </label>
          <select
            id={`priority-${ticket.id}`}
            ref={prioritySelectRef}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            disabled={saving}
            aria-invalid={Boolean(errors.priority)}
            aria-describedby={errors.priority ? `priority-err-${ticket.id}` : undefined}
            className="w-full h-10 px-3 rounded-[6px] border border-slate-300 bg-white text-base sm:text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          >
            {(!ticket.priority || priority === "") && (
              <option value="">Select priority…</option>
            )}
            {PRIORITIES.map((p) => {
              const disabled = isEnterprise && (p === "P2" || p === "P3");
              return (
                <option key={p} value={p} disabled={disabled}>
                  {PRIORITY_LABELS[p]}
                  {disabled ? " (not allowed for enterprise)" : ""}
                </option>
              );
            })}
          </select>
          {errors.priority && (
            <p
              id={`priority-err-${ticket.id}`}
              className="mt-1 text-xs text-red-600 font-medium"
            >
              {errors.priority}
            </p>
          )}
        </div>
      </div>

      {/* Reason Field */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label
            htmlFor={`reason-${ticket.id}`}
            className="block text-xs font-semibold text-slate-800"
          >
            Reason for change (min {REASON_MIN_LENGTH} characters)
          </label>
          <span
            className={`text-xs tabular-nums ${
              trimmedLength < REASON_MIN_LENGTH
                ? "text-slate-500"
                : trimmedLength > REASON_MAX_LENGTH
                ? "text-red-600 font-medium"
                : "text-emerald-700 font-medium"
            }`}
          >
            {trimmedLength}/{REASON_MIN_LENGTH} characters
          </span>
        </div>
        <textarea
          id={`reason-${ticket.id}`}
          ref={reasonTextareaRef}
          rows={3}
          maxLength={REASON_MAX_LENGTH}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={saving}
          aria-invalid={Boolean(errors.reason)}
          aria-describedby={errors.reason ? `reason-err-${ticket.id}` : undefined}
          placeholder="Explain why category or priority was changed…"
          className="w-full p-2.5 rounded-[6px] border border-slate-300 bg-white text-base sm:text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
        />
        {errors.reason && (
          <p
            id={`reason-err-${ticket.id}`}
            className="mt-1 text-xs text-red-600 font-medium"
          >
            {errors.reason}
          </p>
        )}
      </div>

      {/* Form Level Error */}
      {errors.form && (
        <div
          role="alert"
          className="p-2.5 rounded-[4px] border border-red-200 bg-red-50 text-xs text-red-800"
        >
          {errors.form}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-[6px] bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2 cursor-pointer transition-colors"
        >
          {saving ? "Saving…" : "Save change"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-[6px] border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
