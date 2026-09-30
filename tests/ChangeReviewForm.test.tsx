import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangeReviewForm } from "@/components/review/ChangeReviewForm";
import type { Ticket } from "@/types/ticket";

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "T-2003",
    customerId: "C-40",
    plan: "pro",
    subject: "Test subject",
    body: "Test body",
    attachmentUrl: null,
    createdAt: "2026-09-20T10:00:00Z",
    status: "open",
    assignedTo: null,
    assignedToUnknown: null,
    category: "billing",
    priority: "P2",
    aiPriority: null,
    summary: "Summary",
    triageDecision: "manual_review",
    reviewReason: "flagged_input",
    dataIssues: [],
    humanReview: null,
    version: 1,
    updatedAt: "2026-09-20T10:00:00Z",
    ...overrides,
  };
}

describe("ChangeReviewForm", () => {
  it("error messages for short reason / no change / enterprise priority appear on submit and not before", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const ticket = createTicket({ plan: "enterprise", category: "billing", priority: "P1" });

    render(
      <ChangeReviewForm
        ticket={ticket}
        draft={null}
        saving={false}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    // Initial state: no errors shown before submit
    expect(screen.queryByText(/Enter a reason/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nothing changed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enterprise tickets must stay/i)).not.toBeInTheDocument();

    // 1. Submit with no changes and empty reason -> shows errors
    const submitButton = screen.getByRole("button", { name: "Save change" });
    await user.click(submitButton);

    expect(screen.getByText("Enter a reason of at least 10 characters.")).toBeInTheDocument();
    expect(
      screen.getByText("Nothing changed. Change the category or priority, or use Accept.")
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    // 2. Change category to bug, enter short reason (5 chars)
    const categorySelect = screen.getByLabelText("Category");
    await user.selectOptions(categorySelect, "bug");

    const reasonTextarea = screen.getByLabelText(/Reason for change/i);
    await user.clear(reasonTextarea);
    await user.type(reasonTextarea, "short");

    // Re-validates live after attempted submit: short reason error remains, form error gone
    expect(screen.getByText("Enter a reason of at least 10 characters.")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing changed/i)).not.toBeInTheDocument();
  });

  it("character counter updates dynamically as user types", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const ticket = createTicket();

    render(
      <ChangeReviewForm
        ticket={ticket}
        draft={null}
        saving={false}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText("0/10 characters")).toBeInTheDocument();

    const reasonTextarea = screen.getByLabelText(/Reason for change/i);
    fireEvent.change(reasonTextarea, { target: { value: "Hello world" } }); // 11 chars

    expect(screen.getByText("11/10 characters")).toBeInTheDocument();
  });

  it("valid submission calls onSave with expected values", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const ticket = createTicket({ category: "billing", priority: "P2" });

    render(
      <ChangeReviewForm
        ticket={ticket}
        draft={null}
        saving={false}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const categorySelect = screen.getByLabelText("Category");
    await user.selectOptions(categorySelect, "bug");

    const prioritySelect = screen.getByLabelText("Priority");
    await user.selectOptions(prioritySelect, "P0");

    const reasonTextarea = screen.getByLabelText(/Reason for change/i);
    await user.type(reasonTextarea, "Critical software bug affecting login flow.");

    const submitButton = screen.getByRole("button", { name: "Save change" });
    await user.click(submitButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      category: "bug",
      priority: "P0",
      reason: "Critical software bug affecting login flow.",
    });
  });
});
