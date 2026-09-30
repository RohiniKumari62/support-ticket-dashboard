import type { Category, Plan, Priority, RawTicket, Ticket } from "@/types/ticket";
import { normalizeTickets } from "@/lib/tickets/normalize";
import { MOCK_TICKETS } from "@/data/mock-tickets";
import { TEST_TICKETS } from "@/data/test-tickets";
import { createRng } from "./rng";

const CATEGORY_TEMPLATES: Record<
  Category,
  { subjects: string[]; bodies: string[] }
> = {
  billing: {
    subjects: [
      "Unexpected charge on monthly statement",
      "Request for updated tax invoice with VAT ID",
      "Unable to update credit card details in billing settings",
      "Annual subscription renewal pricing discrepancy",
      "Refund request for duplicate charge on account",
      "Payment failed for latest invoice renewal",
      "Enterprise billing inquiry regarding seat reconciliation",
    ],
    bodies: [
      "Our finance department noticed an unexpected charge on this month's invoice. Can you provide a breakdown?",
      "We need our company VAT ID and business address added to all past and future invoices.",
      "Every time we attempt to enter our new company credit card, the billing form throws a generic card verification error.",
      "We were billed the full rate instead of the discounted annual rate agreed upon in our contract.",
      "It appears our card was billed twice for the same subscription period. Please issue a refund.",
      "The automatic renewal payment failed this morning, though our card is active. Please help us avoid service interruption.",
    ],
  },
  bug: {
    subjects: [
      "Dashboard analytics widget fails to render in Chrome",
      "Export to CSV produces empty file for large date ranges",
      "Webhook delivery fails intermittently with 502 Bad Gateway",
      "Search indexing delay on recently created records",
      "Broken link in notification email templates",
      "Mobile view modal dialog cannot be closed",
      "API rate limiting triggering prematurely under normal load",
    ],
    bodies: [
      "When loading the analytics dashboard on Chrome 128, the charts stay in a loading state and throw a console error.",
      "Exporting records spanning more than 30 days generates a 0-byte CSV file without an error notification.",
      "Our endpoint receives intermittent 502 responses during high-volume automated webhook dispatches.",
      "Newly created items take upwards of 45 minutes to appear in search results across all workspaces.",
      "Clicking 'View Ticket' from the notification email leads to a 404 URL due to a missing environment slug.",
      "On mobile screen sizes, the modal backdrop covers the close icon, preventing users from dismissing it.",
    ],
  },
  account_access: {
    subjects: [
      "SSO login failure with Okta SAML response",
      "Two-factor authentication reset required after phone loss",
      "Account locked out following multiple password attempts",
      "New team member not receiving email invitation",
      "Permission denied when accessing assigned workspace",
      "Session timeout occurring too frequently",
      "SCIM user provisioning sync error",
    ],
    bodies: [
      "Our team members are receiving a SAML validation error when signing in via Okta this morning.",
      "I lost access to my authenticator app and cannot complete 2FA login. Please reset my 2FA.",
      "My account was locked after entering an old password. Please unlock my credentials.",
      "We invited three new colleagues yesterday, but none have received the onboarding invitation email.",
      "User has been assigned editor permissions, yet receives an unauthorized error when opening the project.",
      "We are being logged out every 15 minutes despite checking 'Remember me'.",
    ],
  },
  feature_request: {
    subjects: [
      "Add support for dark mode in dashboard interface",
      "Request for audit log export in SIEM format",
      "Custom SLA rules based on customer tier",
      "Keyboard shortcut support for quick ticket triage",
      "Support for additional webhook event types",
      "Bulk tag editing in list view",
    ],
    bodies: [
      "Our support agents work long shifts and would greatly appreciate an official dark mode theme.",
      "We need to export security and audit logs to our central SIEM system via automated API or S3 bucket.",
      "It would be very helpful to define custom SLA policies for VIP and enterprise customers.",
      "Adding keyboard shortcuts like 'j/k' for navigation and 'c' for claim would speed up agent workflows.",
      "Please add webhook events for ticket assignment changes and status transitions.",
    ],
  },
  other: {
    subjects: [
      "General inquiry about API rate limits and quotas",
      "Documentation clarification regarding data retention",
      "Inquiry about scheduled maintenance window",
      "Request for security compliance documentation (SOC2)",
      "Question regarding multi-region data hosting",
    ],
    bodies: [
      "Could you clarify the maximum burst rate permitted on the v2 REST API endpoints?",
      "We need written documentation detailing your data retention and purge schedules for GDPR compliance.",
      "Is there any scheduled maintenance planned for the upcoming weekend?",
      "Please share your latest SOC2 Type II audit report for our compliance review.",
    ],
  },
};

const CATEGORIES: Category[] = [
  "billing",
  "bug",
  "account_access",
  "feature_request",
  "other",
];

const SLA_WINDOW_MS: Record<Priority, number> = {
  P0: 1 * 3600 * 1000,
  P1: 4 * 3600 * 1000,
  P2: 24 * 3600 * 1000,
  P3: 72 * 3600 * 1000,
};

export interface BuildSeedOptions {
  now?: number;
  generatedCount?: number;
  random?: () => number;
}

export function buildSeed(options: BuildSeedOptions = {}): {
  tickets: Ticket[];
  duplicatesRemoved: number;
} {
  const nowMs = options.now ?? Date.now();
  const generatedCount = options.generatedCount ?? 4960;
  const rand = options.random ?? createRng(42);

  const rawGenerated: RawTicket[] = [];

  for (let i = 1; i <= generatedCount; i++) {
    const id = `T-${10000 + i}`;
    const custId = `C-${1000 + (i % 800)}`;

    // Plan distribution: free ~50%, pro ~35%, enterprise ~15%
    const planRoll = rand();
    let plan: Plan = "free";
    if (planRoll < 0.15) {
      plan = "enterprise";
    } else if (planRoll < 0.5) {
      plan = "pro";
    }

    // Category
    const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
    const templates = CATEGORY_TEMPLATES[category];
    const subject =
      templates.subjects[Math.floor(rand() * templates.subjects.length)];
    const body = templates.bodies[Math.floor(rand() * templates.bodies.length)];

    // Priority: P0-P3, enterprise NEVER below P1
    const pRoll = rand();
    let priority: Priority = "P3";
    if (pRoll < 0.08) priority = "P0";
    else if (pRoll < 0.3) priority = "P1";
    else if (pRoll < 0.65) priority = "P2";

    let aiPriority: Priority | null = null;
    let reviewReason: string | null = null;

    if (plan === "enterprise" && (priority === "P2" || priority === "P3")) {
      aiPriority = priority;
      priority = "P1";
      reviewReason = "rule_adjusted";
    }

    // Status distribution:
    // open ~12%, in_progress ~4%, resolved ~24%, closed ~60%
    const statusRoll = rand();
    let status: "open" | "in_progress" | "resolved" | "closed" = "closed";
    let assignedTo: string | null = null;

    if (statusRoll < 0.12) {
      status = "open";
      // ~90% unassigned, ~10% assigned
      if (rand() < 0.1) {
        assignedTo = `agent-${Math.floor(rand() * 3) + 1}`;
      }
    } else if (statusRoll < 0.16) {
      status = "in_progress";
      assignedTo = `agent-${Math.floor(rand() * 3) + 1}`;
    } else if (statusRoll < 0.4) {
      status = "resolved";
      assignedTo = `agent-${Math.floor(rand() * 3) + 1}`;
    } else {
      status = "closed";
      assignedTo = `agent-${Math.floor(rand() * 3) + 1}`;
    }

    // Triage decision: ~2% manual_review with plausible review_reason
    let triageDecision: "auto_accept" | "manual_review" = "auto_accept";
    if (rand() < 0.02) {
      triageDecision = "manual_review";
      const reasons = [
        "Low AI confidence score (<0.65)",
        "Ambiguous customer sentiment and urgency",
        "Multiple conflicting issues mentioned in body",
        "Keywords require senior human review",
      ];
      reviewReason = reasons[Math.floor(rand() * reasons.length)];
    }

    // Created At relative to now
    let createdAtMs: number;
    if (status === "resolved" || status === "closed") {
      // Spread over the last 7 days
      createdAtMs = nowMs - Math.floor(rand() * 7 * 24 * 3600 * 1000) - 60000;
    } else {
      // open / in_progress: elapsed fraction of SLA window
      // 50% on track, 15% at risk, 35% late
      const slaWindow = SLA_WINDOW_MS[priority];
      const deadlineRoll = rand();
      let elapsedFraction: number;

      if (deadlineRoll < 0.5) {
        // on track (elapsed 20% to 75% of window, remaining > 20%)
        elapsedFraction = 0.2 + rand() * 0.55;
      } else if (deadlineRoll < 0.65) {
        // at risk (elapsed 82% to 98% of window, remaining < 20% and > 0)
        elapsedFraction = 0.82 + rand() * 0.16;
      } else {
        // late (elapsed > 100% of window)
        elapsedFraction = 1.05 + rand() * 0.8;
      }

      createdAtMs = nowMs - Math.floor(elapsedFraction * slaWindow);
    }

    rawGenerated.push({
      external_id: id,
      customer_id: custId,
      customer_plan: plan,
      subject,
      body,
      attachment_url: null,
      created_at: new Date(createdAtMs).toISOString(),
      status,
      assigned_to: assignedTo,
      category,
      priority,
      ai_priority: aiPriority,
      summary: subject.length > 50 ? `${subject.slice(0, 50)}…` : subject,
      triage_decision: triageDecision,
      review_reason: reviewReason,
    });
  }

  // Combine raw generated + existing mock tickets + test tickets (duplicates included)
  const allRaw: RawTicket[] = [
    ...rawGenerated,
    ...MOCK_TICKETS,
    ...TEST_TICKETS,
  ];

  return normalizeTickets(allRaw, new Date(nowMs));
}
