"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Dealer = {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  sales_phone: string | null;
  lead_email: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  brand_color: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;

  /**
   * Future-backed fields. These are optional so this page still works against the
   * current dealers table/API while the billing + routing schema is finalized.
   */
  crm_email?: string | null;
  routing_cc_emails?: string[] | string | null;
  billing_contact_name?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  billing_status?: string | null;
};

type CommunicationDirection = "inbound" | "outbound";
type CommunicationStatus = "draft" | "sent" | "received" | "failed";

type CommunicationMessage = {
  id: string;
  dealer_id: string | null;
  dealer_slug?: string | null;
  dealer_name?: string | null;
  direction: CommunicationDirection;
  status?: CommunicationStatus | string | null;
  from_email: string;
  to_email: string;
  cc_emails?: string[] | string | null;
  subject: string;
  body: string;
  created_at?: string | null;
  sent_at?: string | null;
  received_at?: string | null;
  opened_at?: string | null;
  marketing_stage?: string | null;
  provider?: string | null;
  provider_message_id?: string | null;
  thread_key?: string | null;
  contact_email?: string | null;
  reply_to_message_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ComposeForm = {
  dealer_id: string;
  to_email: string;
  cc_emails: string;
  subject: string;
  body: string;
  marketing_stage: string;
};

const blankCompose: ComposeForm = {
  dealer_id: "",
  to_email: "",
  cc_emails: "",
  subject: "",
  body: "",
  marketing_stage: "general",
};

type DealerForm = {
  id: string | null;
  slug: string;
  name: string;
  legal_name: string;
  sales_phone: string;
  lead_email: string;
  crm_email: string;
  routing_cc_emails: string;
  billing_contact_name: string;
  billing_email: string;
  billing_phone: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  billing_status: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  brand_color: string;
  is_active: boolean;
};

const blankForm: DealerForm = {
  id: null,
  slug: "",
  name: "",
  legal_name: "",
  sales_phone: "",
  lead_email: "",
  crm_email: "",
  routing_cc_emails: "",
  billing_contact_name: "",
  billing_email: "",
  billing_phone: "",
  stripe_customer_id: "",
  stripe_subscription_id: "",
  billing_status: "not_started",
  address_line: "",
  city: "",
  state: "",
  postal_code: "",
  brand_color: "#b91c1c",
  is_active: true,
};

const dark = "#0f172a";
const muted = "#64748b";
const border = "#e2e8f0";
const soft = "#f8fafc";
const blueSoft = "#eff6ff";
const amberSoft = "#fffbeb";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function dealerToForm(dealer: Dealer): DealerForm {
  return {
    id: dealer.id,
    slug: dealer.slug || "",
    name: dealer.name || "",
    legal_name: dealer.legal_name || "",
    sales_phone: dealer.sales_phone || "",
    lead_email: dealer.lead_email || "",
    crm_email: dealer.crm_email || "",
    routing_cc_emails: normalizeEmailList(dealer.routing_cc_emails),
    billing_contact_name: dealer.billing_contact_name || "",
    billing_email: dealer.billing_email || "",
    billing_phone: dealer.billing_phone || "",
    stripe_customer_id: dealer.stripe_customer_id || "",
    stripe_subscription_id: dealer.stripe_subscription_id || "",
    billing_status: dealer.billing_status || "not_started",
    address_line: dealer.address_line || "",
    city: dealer.city || "",
    state: dealer.state || "",
    postal_code: dealer.postal_code || "",
    brand_color: dealer.brand_color || "#b91c1c",
    is_active: Boolean(dealer.is_active),
  };
}

function hasEmail(value: string | null | undefined) {
  return Boolean(value && value.includes("@"));
}

function normalizeEmailList(value: string[] | string | null | undefined) {
  if (!value) return "";

  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  return String(value);
}

function countEmailList(value: string[] | string | null | undefined) {
  const normalized = normalizeEmailList(value);
  if (!normalized) return 0;

  return normalized
    .split(/[;,\n]/g)
    .map((email) => email.trim())
    .filter((email) => email.includes("@")).length;
}

function isErrorStatus(message: string) {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("could") ||
    lowered.includes("error") ||
    lowered.includes("failed")
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "No timestamp";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function messageTime(message: CommunicationMessage) {
  return message.sent_at || message.received_at || message.created_at || null;
}

function splitEmailList(value: string[] | string | null | undefined) {
  return normalizeEmailList(value)
    .split(/[;,\n]/g)
    .map((email) => email.trim())
    .filter(Boolean);
}

function uniqueEmailList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter((value) => value.includes("@")),
    ),
  );
}

function dealerRecipientOptions(dealer: Dealer | undefined) {
  if (!dealer) return [];

  return uniqueEmailList([
    dealer.lead_email,
    dealer.crm_email,
    dealer.billing_email,
    ...splitEmailList(dealer.routing_cc_emails),
  ]);
}

function fieldStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "12px 13px",
    borderRadius: 13,
    border: "1px solid #cbd5e1",
    background: "white",
    color: dark,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };
}

function textareaStyle(): CSSProperties {
  return {
    ...fieldStyle(),
    minHeight: 86,
    resize: "vertical",
    lineHeight: 1.45,
    fontFamily: "Arial, Helvetica, sans-serif",
  };
}

function labelStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: 900,
  };
}

function helperStyle(): CSSProperties {
  return {
    color: muted,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.35,
  };
}

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${border}`,
  borderRadius: 999,
  background: "white",
  color: dark,
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div style={{ margin: "18px 0 10px" }}>
      <h3
        style={{
          margin: 0,
          color: dark,
          fontSize: 14,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      {note ? (
        <p
          style={{
            margin: "4px 0 0",
            color: muted,
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "green" | "gray" | "amber" | "blue" | "red";
}) {
  const styles: Record<typeof tone, CSSProperties> = {
    green: { background: "#dcfce7", color: "#166534" },
    gray: { background: "#e2e8f0", color: "#475569" },
    amber: { background: "#fef3c7", color: "#92400e" },
    blue: { background: "#dbeafe", color: "#1d4ed8" },
    red: { background: "#fee2e2", color: "#991b1b" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...styles[tone],
      }}
    >
      {children}
    </span>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 14,
        background: soft,
        border: `1px solid ${border}`,
        minWidth: 0,
      }}
    >
      <span
        style={{
          display: "block",
          color: muted,
          fontSize: 11,
          fontWeight: 900,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "block",
          color: dark,
          fontSize: 12,
          marginTop: 3,
          overflowWrap: "anywhere",
        }}
      >
        {value || "Not set"}
      </span>
    </div>
  );
}

function normalizeThreadSubject(value: string | null | undefined) {
  return String(value || "No subject")
    .replace(/^\s*((re|fw|fwd):\s*)+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() || "no subject";
}

function prettyThreadSubject(value: string | null | undefined) {
  const cleaned = String(value || "No subject")
    .replace(/^\s*((re|fw|fwd):\s*)+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "No subject";
}

function getMessageContactEmail(message: CommunicationMessage) {
  if (message.contact_email && message.contact_email.includes("@")) {
    return message.contact_email.toLowerCase();
  }

  const candidate =
    message.direction === "inbound" ? message.from_email : message.to_email;

  return String(candidate || "").toLowerCase();
}

function getMessageThreadKey(message: CommunicationMessage) {
  if (message.thread_key) return message.thread_key;
  return `${getMessageContactEmail(message)}::${normalizeThreadSubject(message.subject)}`;
}

function messageTimestamp(message: CommunicationMessage) {
  const value = messageTime(message);
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function excerpt(value: string | null | undefined, max = 96) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "No body captured.";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [form, setForm] = useState<DealerForm>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [communicationMessages, setCommunicationMessages] = useState<
    CommunicationMessage[]
  >([]);
  const [communicationsLoading, setCommunicationsLoading] = useState(false);
  const [communicationsStatus, setCommunicationsStatus] = useState("");
  const [communicationTab, setCommunicationTab] = useState<
    "all" | CommunicationDirection
  >("all");
  const [compose, setCompose] = useState<ComposeForm>(blankCompose);
  const [sendingCommunication, setSendingCommunication] = useState(false);
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [threadReplyBody, setThreadReplyBody] = useState("");
  const [replyingThread, setReplyingThread] = useState(false);

  const isEditing = Boolean(form.id);
  const routingCcCount = countEmailList(form.routing_cc_emails);
  const managerReady = hasEmail(form.lead_email);
  const crmReady = hasEmail(form.crm_email) || managerReady;
  const billingReady = hasEmail(form.billing_email);
  const stripeReady = Boolean(
    form.stripe_customer_id || form.stripe_subscription_id,
  );
  const selectedCommunicationDealer = dealers.find(
    (dealer) => dealer.id === compose.dealer_id,
  );
  const selectedRecipientOptions = dealerRecipientOptions(
    selectedCommunicationDealer,
  );
  const visibleCommunicationMessages = communicationMessages.filter(
    (message) =>
      communicationTab === "all"
        ? true
        : message.direction === communicationTab,
  );
  const inboundCount = communicationMessages.filter(
    (message) => message.direction === "inbound",
  ).length;
  const outboundCount = communicationMessages.filter(
    (message) => message.direction === "outbound",
  ).length;

  const filteredDealers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dealers;

    return dealers.filter((dealer) =>
      [
        dealer.name,
        dealer.slug,
        dealer.lead_email,
        dealer.crm_email,
        dealer.routing_cc_emails,
        dealer.billing_contact_name,
        dealer.billing_email,
        dealer.stripe_customer_id,
        dealer.city,
        dealer.state,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [dealers, search]);

  async function loadDealers() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/dealers", {
        method: "GET",
        cache: "no-store",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not load dealers.");
      }

      setDealers(Array.isArray(json.dealers) ? json.dealers : []);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not load dealers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDealers();
  }, []);

  function updateField<K extends keyof DealerForm>(
    key: K,
    value: DealerForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function startCreate() {
    setForm(blankForm);
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(dealer: Dealer) {
    setForm(dealerToForm(dealer));
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDealer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      /**
       * Keep the payload compatible with the current /api/admin/dealers route.
       * crm_email is included as a future-backed CRM intake field. If your
       * current API/table does not have this column yet, add it before deploy:
       * alter table solacetrade.dealers add column if not exists crm_email text;
       */
      const payload = {
        id: form.id,
        slug: normalizeSlug(form.slug),
        name: form.name,
        legal_name: form.legal_name,
        sales_phone: form.sales_phone,
        lead_email: form.lead_email,
        crm_email: form.crm_email,
        routing_cc_emails: form.routing_cc_emails,
        billing_contact_name: form.billing_contact_name,
        billing_email: form.billing_email,
        billing_phone: form.billing_phone,
        address_line: form.address_line,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        brand_color: form.brand_color,
        is_active: form.is_active,
      };

      const response = await fetch("/api/admin/dealers", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not save dealer.");
      }

      const futureFieldsEntered = Boolean(
        form.crm_email ||
        form.routing_cc_emails ||
        form.billing_contact_name ||
        form.billing_email ||
        form.billing_phone ||
        form.stripe_customer_id ||
        form.stripe_subscription_id,
      );

      setStatus(
        futureFieldsEntered
          ? `${isEditing ? "Dealer updated" : "Dealer created"}. CRM intake, billing, and CC routing saved. Stripe fields are managed by checkout/webhooks.`
          : isEditing
            ? "Dealer updated."
            : "Dealer created.",
      );
      setForm(blankForm);
      await loadDealers();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not save dealer.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleDealer(dealer: Dealer) {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/dealers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dealer.id,
          is_active: !dealer.is_active,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not update dealer status.");
      }

      setStatus(dealer.is_active ? "Dealer deactivated." : "Dealer activated.");
      await loadDealers();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not update dealer status.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadCommunications(dealerId = compose.dealer_id) {
    setCommunicationsLoading(true);
    setCommunicationsStatus("");

    try {
      const params = new URLSearchParams();
      if (dealerId) params.set("dealerId", dealerId);

      const response = await fetch(
        `/api/admin/dealer-communications${params.toString() ? `?${params}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not load dealer communications.");
      }

      setCommunicationMessages(
        Array.isArray(json.messages) ? json.messages : [],
      );
    } catch (error) {
      setCommunicationsStatus(
        error instanceof Error
          ? error.message
          : "Could not load dealer communications.",
      );
      setCommunicationMessages([]);
    } finally {
      setCommunicationsLoading(false);
    }
  }

  useEffect(() => {
    loadCommunications(compose.dealer_id);

    const interval = window.setInterval(() => {
      loadCommunications(compose.dealer_id);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [compose.dealer_id]);

  function selectCommunicationDealer(dealerId: string) {
    const dealer = dealers.find((item) => item.id === dealerId);
    const recipients = dealerRecipientOptions(dealer);

    setCompose((previous) => ({
      ...previous,
      dealer_id: dealerId,
      to_email: recipients[0] || "",
    }));

    loadCommunications(dealerId);
  }

  function updateComposeField<K extends keyof ComposeForm>(
    key: K,
    value: ComposeForm[K],
  ) {
    setCompose((previous) => ({ ...previous, [key]: value }));
  }

  function applyMarketingTemplate(kind: "intro" | "followup" | "pricing") {
    const dealerName = selectedCommunicationDealer?.name || "your dealership";

    const templates: Record<
      typeof kind,
      Pick<ComposeForm, "subject" | "body" | "marketing_stage">
    > = {
      intro: {
        marketing_stage: "intro",
        subject: `Cleaner trade intake for ${dealerName}`,
        body: `Hi,

I wanted to put SolaceTrade in front of you because most trade-in tools still behave like lead forms. The customer submits partial information, the store chases details, and the first desk review starts with missing context.

SolaceTrade turns that into a guided vehicle scan. The customer captures the front, side, rear, odometer, and VIN. Your team receives a cleaner acquisition file with photos, mileage, VIN context, condition signals, and a faster path to a real offer.

The point is simple: fewer weak trade leads, better first-touch information, and a more useful deal file before anyone starts chasing the customer.

Worth a quick look?

Best,
Tim`,
      },
      followup: {
        marketing_stage: "follow_up",
        subject: `Following up on SolaceTrade`,
        body: `Hi,

Following up here. SolaceTrade is built for one specific problem: trade opportunities often arrive before the store has enough evidence to act quickly.

Instead of another generic form, the customer walks through a short scan and your team gets the vehicle evidence up front. That means less back-and-forth, cleaner manager review, and a better shot at keeping the customer moving.

Best,
Tim`,
      },
      pricing: {
        marketing_stage: "pricing",
        subject: `SolaceTrade pricing`,
        body: `Hi,

For a single rooftop, SolaceTrade is currently positioned at $595/month with setup handled directly.

That includes the customer-facing scan flow, internal staff intake option, dealer dashboard, routing, and the manager-ready trade opportunity file.

The goal is not to replace dealer control. It gives the desk better evidence earlier so the store can move faster and make cleaner acquisition decisions.

Best,
Tim`,
      },
    };

    setCompose((previous) => ({ ...previous, ...templates[kind] }));
  }

  async function sendMarketingEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendingCommunication(true);
    setCommunicationsStatus("");

    try {
      if (!compose.to_email.includes("@")) {
        throw new Error("Add a valid recipient email before sending.");
      }

      if (!compose.subject.trim()) {
        throw new Error("Subject is required before sending.");
      }

      if (!compose.body.trim()) {
        throw new Error("Message body is required before sending.");
      }

      const response = await fetch("/api/admin/dealer-communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_id: compose.dealer_id || null,
          to_email: compose.to_email,
          cc_emails: compose.cc_emails,
          subject: compose.subject,
          body: compose.body,
          marketing_stage: compose.marketing_stage,
          direction: "outbound",
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not send marketing email.");
      }

      if (!json.ok && json.error) {
        throw new Error(json.error);
      }

      setCommunicationsStatus(
        compose.dealer_id
          ? "Dealer marketing email sent and logged."
          : "Direct outreach email sent and logged.",
      );
      setCompose((previous) => ({
        ...previous,
        subject: "",
        body: "",
        marketing_stage: "general",
      }));
      await loadCommunications(compose.dealer_id);
    } catch (error) {
      setCommunicationsStatus(
        error instanceof Error
          ? error.message
          : "Could not send marketing email.",
      );
    } finally {
      setSendingCommunication(false);
    }
  }


  const communicationThreads = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        contactEmail: string;
        subject: string;
        dealerId: string;
        dealerName: string;
        marketingStage: string;
        messages: CommunicationMessage[];
        lastMessage: CommunicationMessage;
        lastTimestamp: number;
        inboundCount: number;
        outboundCount: number;
      }
    >();

    for (const message of visibleCommunicationMessages) {
      const key = getMessageThreadKey(message);
      const current = grouped.get(key);
      const timestamp = messageTimestamp(message);
      const contactEmail = getMessageContactEmail(message);
      const dealerName = message.dealer_name || message.dealer_slug || "Direct Outreach";
      const dealerId = message.dealer_id || "";
      const marketingStage = message.marketing_stage || "general";

      if (!current) {
        grouped.set(key, {
          key,
          contactEmail,
          subject: prettyThreadSubject(message.subject),
          dealerId,
          dealerName,
          marketingStage,
          messages: [message],
          lastMessage: message,
          lastTimestamp: timestamp,
          inboundCount: message.direction === "inbound" ? 1 : 0,
          outboundCount: message.direction === "outbound" ? 1 : 0,
        });
        continue;
      }

      current.messages.push(message);
      if (timestamp >= current.lastTimestamp) {
        current.lastMessage = message;
        current.lastTimestamp = timestamp;
      }
      if (message.direction === "inbound") current.inboundCount += 1;
      if (message.direction === "outbound") current.outboundCount += 1;
      if (!current.dealerId && dealerId) current.dealerId = dealerId;
      if (current.dealerName === "Direct Outreach" && dealerName !== "Direct Outreach") {
        current.dealerName = dealerName;
      }
    }

    return Array.from(grouped.values())
      .map((thread) => ({
        ...thread,
        messages: [...thread.messages].sort(
          (a, b) => messageTimestamp(a) - messageTimestamp(b),
        ),
      }))
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [visibleCommunicationMessages]);

  const selectedThread = useMemo(() => {
    if (!communicationThreads.length) return null;
    if (selectedThreadKey) {
      return (
        communicationThreads.find((thread) => thread.key === selectedThreadKey) ||
        communicationThreads[0]
      );
    }
    return communicationThreads[0];
  }, [communicationThreads, selectedThreadKey]);

  useEffect(() => {
    if (!communicationThreads.length) {
      setSelectedThreadKey(null);
      return;
    }

    if (!selectedThreadKey || !communicationThreads.some((thread) => thread.key === selectedThreadKey)) {
      setSelectedThreadKey(communicationThreads[0].key);
    }
  }, [communicationThreads, selectedThreadKey]);

  function beginThreadReply(thread = selectedThread) {
    if (!thread) return;

    setCompose((previous) => ({
      ...previous,
      dealer_id: thread.dealerId || previous.dealer_id,
      to_email: thread.contactEmail,
      subject: thread.subject.toLowerCase().startsWith("re:")
        ? thread.subject
        : `Re: ${thread.subject}`,
      marketing_stage:
        thread.marketingStage === "general" ? "follow_up" : thread.marketingStage,
    }));

    setThreadReplyBody("");
  }

  async function sendThreadReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread) return;

    setReplyingThread(true);
    setCommunicationsStatus("");

    try {
      const body = threadReplyBody.trim();

      if (!body) {
        throw new Error("Reply message is required.");
      }

      const response = await fetch("/api/admin/dealer-communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_id: selectedThread.dealerId || null,
          to_email: selectedThread.contactEmail,
          cc_emails: "",
          subject: selectedThread.subject.toLowerCase().startsWith("re:")
            ? selectedThread.subject
            : `Re: ${selectedThread.subject}`,
          body,
          marketing_stage:
            selectedThread.marketingStage === "general"
              ? "follow_up"
              : selectedThread.marketingStage,
          direction: "outbound",
          thread_key: selectedThread.key,
          reply_to_message_id:
            selectedThread.messages[selectedThread.messages.length - 1]?.id || null,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not send reply.");
      }

      if (!json.ok && json.error) {
        throw new Error(json.error);
      }

      setThreadReplyBody("");
      setCommunicationsStatus("Reply sent and added to the conversation.");
      await loadCommunications(compose.dealer_id);
    } catch (error) {
      setCommunicationsStatus(
        error instanceof Error ? error.message : "Could not send reply.",
      );
    } finally {
      setReplyingThread(false);
    }
  }

  const statusIsError = status ? isErrorStatus(status) : false;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.16), transparent 32%), #f4f6f8",
        color: dark,
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 18,
      }}
    >
      <style>{`
        .admin-shell {
          max-width: 1220px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: minmax(360px, 0.92fr) minmax(0, 1.32fr);
          gap: 18px;
          align-items: start;
        }

        .admin-card {
          background: white;
          border: 1px solid ${border};
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 20px 60px rgba(15,23,42,0.08);
        }

        .field-grid {
          display: grid;
          gap: 11px;
        }

        .two-col {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 10px;
        }

        .location-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 96px 120px;
          gap: 8px;
        }

        .dealer-card-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .dealer-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .future-panel {
          padding: 12px;
          border-radius: 18px;
          background: ${amberSoft};
          border: 1px solid #fde68a;
        }

        .communication-grid {
          display: grid;
          grid-template-columns: minmax(320px, 0.88fr) minmax(0, 1.12fr);
          gap: 16px;
          align-items: start;
        }

        .communication-message-list {
          display: grid;
          gap: 10px;
          max-height: 620px;
          overflow: auto;
          padding-right: 4px;
        }

        .communication-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        @media (max-width: 960px) {
          main {
            padding: 12px !important;
          }

          .admin-header {
            flex-direction: column;
          }

          .admin-grid,
          .communication-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .admin-card {
            border-radius: 18px;
            padding: 14px;
          }

          .two-col,
          .location-grid {
            grid-template-columns: 1fr;
          }

          .dealer-card-header {
            flex-direction: column;
          }

          .dealer-actions a,
          .dealer-actions button {
            flex: 1 1 auto;
            text-align: center;
          }
        }
      `}</style>

      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <div
              style={{
                display: "inline-flex",
                padding: "7px 11px",
                borderRadius: 999,
                background: "#e2e8f0",
                color: dark,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              SolaceTrade Admin
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 5vw, 52px)",
                lineHeight: 0.98,
                letterSpacing: "-0.055em",
              }}
            >
              Dealer dashboard.
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                color: muted,
                maxWidth: 760,
                lineHeight: 1.55,
              }}
            >
              Create dealers, configure CRM delivery, manager routing, billing
              ownership, and prepare each dealer for Stripe subscription setup.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreate}
            style={{
              border: "none",
              borderRadius: 14,
              background: dark,
              color: "white",
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 14px 30px rgba(15,23,42,0.16)",
            }}
          >
            + New Dealer
          </button>
        </div>

        <div className="admin-grid">
          <form onSubmit={saveDealer} className="admin-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {isEditing ? "Edit dealer" : "Create dealer"}
                </h2>
                <p
                  style={{
                    margin: "5px 0 0",
                    color: muted,
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  Name, slug, manager routing, and CRM delivery keep every trade
                  opportunity moving.
                </p>
              </div>

              {isEditing ? (
                <Pill tone="gray">Editing</Pill>
              ) : (
                <Pill tone="green">New</Pill>
              )}
            </div>

            <SectionHeader
              title="Dealer identity"
              note="Slug controls both customer and internal URLs."
            />
            <div className="field-grid">
              <label style={labelStyle()}>
                Dealer name
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Brenham CDJR"
                  style={fieldStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Slug
                <input
                  required
                  value={form.slug}
                  onChange={(event) =>
                    updateField("slug", normalizeSlug(event.target.value))
                  }
                  placeholder="brenhamcdjr"
                  style={fieldStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Legal name
                <input
                  value={form.legal_name}
                  onChange={(event) =>
                    updateField("legal_name", event.target.value)
                  }
                  placeholder="Optional legal entity name"
                  style={fieldStyle()}
                />
              </label>
            </div>

            <SectionHeader
              title="Lead delivery and manager routing"
              note="CRM intake gets the working opportunity. Manager routing keeps the used car desk informed."
            />
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                background: blueSoft,
                border: "1px solid #dbeafe",
              }}
            >
              <div className="field-grid">
                <label style={labelStyle()}>
                  Primary Used Car Manager Email
                  <input
                    required
                    type="email"
                    value={form.lead_email}
                    onChange={(event) =>
                      updateField("lead_email", event.target.value)
                    }
                    placeholder="manager@dealer.com"
                    style={fieldStyle()}
                  />
                  <span style={helperStyle()}>
                    Oversight contact for manager review packets.
                  </span>
                </label>

                <label style={labelStyle()}>
                  Primary Lead / CRM Intake Email
                  <input
                    type="email"
                    value={form.crm_email}
                    onChange={(event) =>
                      updateField("crm_email", event.target.value)
                    }
                    placeholder="internet@dealer.com or leads@crm.com"
                    style={fieldStyle()}
                  />
                  <span style={helperStyle()}>
                    Where new trade opportunities should land. Leave blank to
                    use the manager email.
                  </span>
                </label>

                <label style={labelStyle()}>
                  Additional Routing Emails
                  <textarea
                    value={form.routing_cc_emails}
                    onChange={(event) =>
                      updateField("routing_cc_emails", event.target.value)
                    }
                    placeholder="gsm@dealer.com, gm@dealer.com, secondmanager@dealer.com"
                    style={textareaStyle()}
                  />
                </label>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <MiniField
                  label="Manager route"
                  value={form.lead_email || "Required"}
                />
                <MiniField
                  label="CRM intake"
                  value={
                    form.crm_email || form.lead_email || "Uses manager email"
                  }
                />
                <MiniField
                  label="Additional routing"
                  value={
                    routingCcCount
                      ? `${routingCcCount} additional email${routingCcCount === 1 ? "" : "s"}`
                      : "Optional"
                  }
                />
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: "10px 11px",
                  borderRadius: 14,
                  background: "white",
                  border: `1px solid ${border}`,
                  color: muted,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                The CRM intake email is the working lead destination. Manager
                and additional routing emails receive visibility so the desk can
                act without salespeople manually entering addresses.
              </div>
            </div>

            <SectionHeader
              title="Billing contact"
              note="Identify who receives invoices, receipts, payment updates, and subscription notices."
            />
            <div className="future-panel">
              <div className="field-grid">
                <label style={labelStyle()}>
                  Billing Contact Name
                  <input
                    value={form.billing_contact_name}
                    onChange={(event) =>
                      updateField("billing_contact_name", event.target.value)
                    }
                    placeholder="Controller, office manager, or dealer principal"
                    style={fieldStyle()}
                  />
                </label>

                <div className="two-col">
                  <label style={labelStyle()}>
                    Billing Email
                    <input
                      type="email"
                      value={form.billing_email}
                      onChange={(event) =>
                        updateField("billing_email", event.target.value)
                      }
                      placeholder="billing@dealer.com"
                      style={fieldStyle()}
                    />
                  </label>

                  <label style={labelStyle()}>
                    Billing Phone
                    <input
                      value={form.billing_phone}
                      onChange={(event) =>
                        updateField("billing_phone", event.target.value)
                      }
                      placeholder="Optional"
                      style={fieldStyle()}
                    />
                  </label>
                </div>
              </div>
            </div>

            <SectionHeader
              title="Stripe setup"
              note="Use Stripe for monthly billing once the dealer is approved and billing contact is confirmed."
            />
            <div className="future-panel">
              <div className="field-grid">
                <div className="two-col">
                  <label style={labelStyle()}>
                    Stripe Customer ID
                    <input
                      value={form.stripe_customer_id}
                      onChange={(event) =>
                        updateField("stripe_customer_id", event.target.value)
                      }
                      placeholder="cus_..."
                      style={fieldStyle()}
                    />
                  </label>

                  <label style={labelStyle()}>
                    Subscription Status
                    <select
                      value={form.billing_status}
                      onChange={(event) =>
                        updateField("billing_status", event.target.value)
                      }
                      style={fieldStyle()}
                    >
                      <option value="not_started">Not started</option>
                      <option value="trialing">Trialing</option>
                      <option value="active">Active</option>
                      <option value="past_due">Past due</option>
                      <option value="paused">Paused</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </label>
                </div>

                <label style={labelStyle()}>
                  Stripe Subscription ID
                  <input
                    value={form.stripe_subscription_id}
                    onChange={(event) =>
                      updateField("stripe_subscription_id", event.target.value)
                    }
                    placeholder="sub_..."
                    style={fieldStyle()}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <MiniField
                  label="Manager route"
                  value={managerReady ? "Ready" : "Missing"}
                />
                <MiniField
                  label="CRM delivery"
                  value={crmReady ? "Ready" : "Missing"}
                />
                <MiniField
                  label="Billing owner"
                  value={billingReady ? "Ready" : "Missing email"}
                />
                <MiniField label="Default plan" value="$595 / month" />
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: "10px 11px",
                  borderRadius: 14,
                  background: "white",
                  border: `1px solid ${border}`,
                  color: muted,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                Next implementation step: create Stripe customer from billing
                contact, attach the $595/month price, store
                customer/subscription IDs, and listen for invoice/payment
                webhooks.
              </div>
            </div>

            <SectionHeader title="Contact and location" />
            <div className="field-grid">
              <label style={labelStyle()}>
                Sales phone
                <input
                  value={form.sales_phone}
                  onChange={(event) =>
                    updateField("sales_phone", event.target.value)
                  }
                  placeholder="Optional phone"
                  style={fieldStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Address
                <input
                  value={form.address_line}
                  onChange={(event) =>
                    updateField("address_line", event.target.value)
                  }
                  placeholder="Street address"
                  style={fieldStyle()}
                />
              </label>

              <div className="location-grid">
                <label style={labelStyle()}>
                  City
                  <input
                    value={form.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    placeholder="City"
                    style={fieldStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  State
                  <input
                    value={form.state}
                    onChange={(event) =>
                      updateField(
                        "state",
                        event.target.value.toUpperCase().slice(0, 2),
                      )
                    }
                    placeholder="TX"
                    style={fieldStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  ZIP
                  <input
                    value={form.postal_code}
                    onChange={(event) =>
                      updateField("postal_code", event.target.value)
                    }
                    placeholder="77833"
                    style={fieldStyle()}
                  />
                </label>
              </div>
            </div>

            <SectionHeader title="System settings" />
            <div className="field-grid">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 56px",
                  gap: 8,
                  alignItems: "end",
                }}
              >
                <label style={labelStyle()}>
                  Brand color
                  <input
                    value={form.brand_color}
                    onChange={(event) =>
                      updateField("brand_color", event.target.value)
                    }
                    placeholder="#b91c1c"
                    style={fieldStyle()}
                  />
                </label>
                <div
                  title="Brand color preview"
                  style={{
                    height: 43,
                    borderRadius: 13,
                    border: "1px solid #cbd5e1",
                    background: form.brand_color || "#b91c1c",
                  }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: soft,
                  border: `1px solid ${border}`,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                <span>
                  Active dealer
                  <span
                    style={{
                      display: "block",
                      color: muted,
                      fontSize: 12,
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    Active dealers can receive customer and internal intake
                    traffic.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateField("is_active", event.target.checked)
                  }
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 16,
                border: "none",
                borderRadius: 15,
                background: dark,
                color: "white",
                padding: 14,
                fontSize: 14,
                fontWeight: 900,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save dealer"
                  : "Create dealer"}
            </button>

            {status ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 11,
                  borderRadius: 14,
                  background: statusIsError ? "#fef2f2" : "#f0fdf4",
                  color: statusIsError ? "#991b1b" : "#166534",
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: 1.45,
                }}
              >
                {status}
              </div>
            ) : null}
          </form>

          <section className="admin-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Dealers</h2>
                <p style={{ margin: "5px 0 0", color: muted, fontSize: 13 }}>
                  {loading
                    ? "Loading..."
                    : `${filteredDealers.length} shown · ${dealers.length} total`}
                </p>
              </div>
              <button
                type="button"
                onClick={loadDealers}
                disabled={loading}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 13,
                  background: "white",
                  color: dark,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                Refresh
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dealers, slugs, CRM emails, manager emails, billing contacts, or Stripe IDs"
              style={{ ...fieldStyle(), marginTop: 12 }}
            />

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {filteredDealers.map((dealer) => {
                const routingConfigured = hasEmail(dealer.lead_email);
                const crmConfigured =
                  hasEmail(dealer.crm_email) || routingConfigured;
                const extraRoutingCount = countEmailList(
                  dealer.routing_cc_emails,
                );
                const dealerBillingReady = hasEmail(dealer.billing_email);
                const dealerStripeLinked = Boolean(
                  dealer.stripe_customer_id || dealer.stripe_subscription_id,
                );

                return (
                  <article
                    key={dealer.id}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 18,
                      padding: 14,
                      background: dealer.is_active ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <div className="dealer-card-header">
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 16 }}>
                          {dealer.name}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            color: muted,
                            fontSize: 13,
                            marginTop: 4,
                          }}
                        >
                          /{dealer.slug} · /{dealer.slug}/internal
                        </span>
                        <span
                          style={{
                            display: "block",
                            color: crmConfigured ? dark : "#92400e",
                            fontSize: 13,
                            marginTop: 6,
                            overflowWrap: "anywhere",
                          }}
                        >
                          CRM intake:{" "}
                          {dealer.crm_email || dealer.lead_email || "Missing"}
                        </span>
                        <span
                          style={{
                            display: "block",
                            color: routingConfigured ? dark : "#92400e",
                            fontSize: 13,
                            marginTop: 4,
                            overflowWrap: "anywhere",
                          }}
                        >
                          Manager routing: {dealer.lead_email || "Missing"}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Pill tone={dealer.is_active ? "green" : "gray"}>
                          {dealer.is_active ? "Active" : "Inactive"}
                        </Pill>
                        <Pill tone={crmConfigured ? "green" : "amber"}>
                          {crmConfigured ? "CRM set" : "CRM missing"}
                        </Pill>
                        <Pill tone={routingConfigured ? "green" : "amber"}>
                          {routingConfigured
                            ? "Manager set"
                            : "Manager missing"}
                        </Pill>
                        <Pill tone={dealerBillingReady ? "green" : "amber"}>
                          {dealerBillingReady
                            ? "Billing set"
                            : "Billing needed"}
                        </Pill>
                        <Pill tone={dealerStripeLinked ? "green" : "blue"}>
                          {dealerStripeLinked
                            ? "Stripe linked"
                            : "Stripe pending"}
                        </Pill>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <MiniField
                        label="Customer link"
                        value={`/${dealer.slug}`}
                      />
                      <MiniField
                        label="Internal link"
                        value={`/${dealer.slug}/internal`}
                      />
                      <MiniField
                        label="CRM dashboard"
                        value={`/dealer/${dealer.slug}/dashboard`}
                      />
                      <MiniField
                        label="CRM intake"
                        value={
                          dealer.crm_email || dealer.lead_email || "Missing"
                        }
                      />
                      <MiniField
                        label="Manager route"
                        value={dealer.lead_email || "Missing"}
                      />
                      <MiniField
                        label="Additional routing"
                        value={
                          extraRoutingCount
                            ? `${extraRoutingCount} additional`
                            : "None"
                        }
                      />
                      <MiniField
                        label="Billing contact"
                        value={
                          dealer.billing_email ||
                          dealer.billing_contact_name ||
                          "Not set"
                        }
                      />
                      <MiniField
                        label="Stripe customer"
                        value={dealer.stripe_customer_id || "Not linked"}
                      />
                      <MiniField
                        label="Subscription"
                        value={dealer.billing_status || "Not configured"}
                      />
                    </div>

                    <div className="dealer-actions">
                      <a
                        href={`/${dealer.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: soft,
                          border: `1px solid ${border}`,
                          color: dark,
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        Open customer
                      </a>
                      <a
                        href={`/${dealer.slug}/internal`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: soft,
                          border: `1px solid ${border}`,
                          color: dark,
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        Open internal
                      </a>
                      <a
                        href={`/dealer/${dealer.slug}/dashboard`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        Open CRM
                      </a>
                      <button
                        type="button"
                        onClick={() => startEdit(dealer)}
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: dark,
                          border: "none",
                          color: "white",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDealer(dealer)}
                        disabled={saving}
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: dealer.is_active ? "#fff7ed" : "#f0fdf4",
                          border: dealer.is_active
                            ? "1px solid #fed7aa"
                            : "1px solid #bbf7d0",
                          color: dealer.is_active ? "#9a3412" : "#166534",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: saving ? "wait" : "pointer",
                        }}
                      >
                        {dealer.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </article>
                );
              })}

              {!loading && filteredDealers.length === 0 ? (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: soft,
                    border: `1px solid ${border}`,
                    color: muted,
                    fontSize: 14,
                  }}
                >
                  No dealers found.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="admin-card" style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#fff7ed",
                  color: "#9a3412",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Marketing Communication Center
              </div>
              <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.03em" }}>
                SolaceTrade outreach inbox
              </h2>
              <p
                style={{
                  margin: "6px 0 0",
                  color: muted,
                  fontSize: 13,
                  lineHeight: 1.5,
                  maxWidth: 760,
                }}
              >
                Gmail-style threaded outreach for dealer acquisition. Compose direct
                emails, watch inbound replies arrive automatically, and respond from
                the same conversation without exposing this system to dealers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadCommunications()}
              disabled={communicationsLoading}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 13,
                background: "white",
                color: dark,
                padding: "10px 12px",
                fontWeight: 900,
                cursor: communicationsLoading ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {communicationsLoading ? "Loading..." : "Refresh inbox"}
            </button>
          </div>

          <div className="communication-grid" style={{ marginTop: 16 }}>
            <form
              onSubmit={sendMarketingEmail}
              style={{ display: "grid", gap: 12 }}
            >
              <div
                style={{
                  padding: 13,
                  borderRadius: 18,
                  border: `1px solid ${border}`,
                  background: soft,
                }}
              >
                <SectionHeader
                  title="Compose outbound email"
                  note="Dealer is optional. Direct outreach is tracked by contact email and threaded automatically when replies arrive."
                />

                <div className="field-grid">
                  <label style={labelStyle()}>
                    Dealer <span style={{ color: muted, fontWeight: 800 }}>(optional)</span>
                    <select
                      value={compose.dealer_id}
                      onChange={(event) =>
                        selectCommunicationDealer(event.target.value)
                      }
                      style={fieldStyle()}
                    >
                      <option value="">Direct outreach / no dealer selected</option>
                      {dealers.map((dealer) => (
                        <option key={dealer.id} value={dealer.id}>
                          {dealer.name} /{dealer.slug}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={labelStyle()}>
                    To
                    <input
                      required
                      list="dealer-email-options"
                      type="email"
                      value={compose.to_email}
                      onChange={(event) =>
                        updateComposeField("to_email", event.target.value)
                      }
                      placeholder="decisionmaker@dealer.com"
                      style={fieldStyle()}
                    />
                    <datalist id="dealer-email-options">
                      {selectedRecipientOptions.map((email) => (
                        <option key={email} value={email} />
                      ))}
                    </datalist>
                  </label>

                  <label style={labelStyle()}>
                    CC
                    <input
                      value={compose.cc_emails}
                      onChange={(event) =>
                        updateComposeField("cc_emails", event.target.value)
                      }
                      placeholder="Optional: gm@dealer.com, controller@dealer.com"
                      style={fieldStyle()}
                    />
                  </label>

                  <label style={labelStyle()}>
                    Marketing stage
                    <select
                      value={compose.marketing_stage}
                      onChange={(event) =>
                        updateComposeField(
                          "marketing_stage",
                          event.target.value,
                        )
                      }
                      style={fieldStyle()}
                    >
                      <option value="general">General</option>
                      <option value="intro">Intro</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="pricing">Pricing</option>
                      <option value="onboarding">Onboarding</option>
                    </select>
                  </label>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => applyMarketingTemplate("intro")}
                      style={secondaryButtonStyle}
                    >
                      Intro
                    </button>
                    <button
                      type="button"
                      onClick={() => applyMarketingTemplate("followup")}
                      style={secondaryButtonStyle}
                    >
                      Follow-up
                    </button>
                    <button
                      type="button"
                      onClick={() => applyMarketingTemplate("pricing")}
                      style={secondaryButtonStyle}
                    >
                      Pricing
                    </button>
                  </div>

                  <label style={labelStyle()}>
                    Subject
                    <input
                      required
                      value={compose.subject}
                      onChange={(event) =>
                        updateComposeField("subject", event.target.value)
                      }
                      placeholder="Subject line"
                      style={fieldStyle()}
                    />
                  </label>

                  <label style={labelStyle()}>
                    Message
                    <textarea
                      required
                      value={compose.body}
                      onChange={(event) =>
                        updateComposeField("body", event.target.value)
                      }
                      placeholder="Write the dealer outreach email..."
                      style={{ ...textareaStyle(), minHeight: 190 }}
                    />
                    <span style={helperStyle()}>
                      Sent as a branded SolaceTrade HTML email with a plain-text fallback and automatic opt-out footer.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={sendingCommunication}
                  style={{
                    width: "100%",
                    marginTop: 14,
                    border: "none",
                    borderRadius: 15,
                    background: "#ea580c",
                    color: "white",
                    padding: 14,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: sendingCommunication ? "wait" : "pointer",
                    opacity: sendingCommunication ? 0.7 : 1,
                  }}
                >
                  {sendingCommunication ? "Sending..." : "Send HTML outreach email"}
                </button>

                {communicationsStatus ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 11,
                      borderRadius: 14,
                      background: isErrorStatus(communicationsStatus)
                        ? "#fef2f2"
                        : "#f0fdf4",
                      color: isErrorStatus(communicationsStatus)
                        ? "#991b1b"
                        : "#166534",
                      fontSize: 13,
                      fontWeight: 800,
                      lineHeight: 1.45,
                    }}
                  >
                    {communicationsStatus}
                  </div>
                ) : null}
              </div>
            </form>

            <div
              style={{
                padding: 13,
                borderRadius: 18,
                border: `1px solid ${border}`,
                background: "white",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    Conversations
                  </h3>
                  <p style={{ margin: "5px 0 0", color: muted, fontSize: 12 }}>
                    {communicationsLoading
                      ? "Loading communication history..."
                      : `${communicationThreads.length} threads · ${inboundCount} inbound · ${outboundCount} outbound`}
                  </p>
                </div>
                <Pill tone="blue">Email only</Pill>
              </div>

              <div className="communication-tabs">
                {[
                  ["all", "All"],
                  ["inbound", "Inbound"],
                  ["outbound", "Outbound"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setCommunicationTab(
                        value as "all" | CommunicationDirection,
                      )
                    }
                    style={{
                      border:
                        communicationTab === value
                          ? "1px solid #fb923c"
                          : `1px solid ${border}`,
                      borderRadius: 999,
                      background:
                        communicationTab === value ? "#fff7ed" : "white",
                      color: communicationTab === value ? "#9a3412" : dark,
                      padding: "8px 11px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(210px, 0.78fr) minmax(0, 1.22fr)",
                  gap: 12,
                  marginTop: 12,
                  minHeight: 560,
                }}
              >
                <div
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: soft,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 11px",
                      borderBottom: `1px solid ${border}`,
                      background: "white",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>Thread list</strong>
                    <span style={{ color: muted, fontSize: 11, fontWeight: 800 }}>
                      {communicationThreads.length}
                    </span>
                  </div>

                  <div style={{ maxHeight: 600, overflow: "auto" }}>
                    {communicationThreads.map((thread) => {
                      const selected = selectedThread?.key === thread.key;
                      return (
                        <button
                          key={thread.key}
                          type="button"
                          onClick={() => setSelectedThreadKey(thread.key)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            borderBottom: `1px solid ${border}`,
                            background: selected ? "#eff6ff" : "white",
                            padding: 11,
                            cursor: "pointer",
                            display: "grid",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              alignItems: "baseline",
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 13,
                                color: dark,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {thread.subject}
                            </strong>
                            <span style={{ color: muted, fontSize: 10, whiteSpace: "nowrap" }}>
                              {formatDateTime(messageTime(thread.lastMessage))}
                            </span>
                          </span>
                          <span
                            style={{
                              color: muted,
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {thread.contactEmail}
                          </span>
                          <span style={{ color: "#334155", fontSize: 12, lineHeight: 1.35 }}>
                            {excerpt(thread.lastMessage.body)}
                          </span>
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Pill tone={thread.inboundCount ? "blue" : "gray"}>
                              {thread.inboundCount} in
                            </Pill>
                            <Pill tone={thread.outboundCount ? "amber" : "gray"}>
                              {thread.outboundCount} out
                            </Pill>
                          </span>
                        </button>
                      );
                    })}

                    {!communicationsLoading && communicationThreads.length === 0 ? (
                      <div
                        style={{
                          padding: 16,
                          color: muted,
                          fontSize: 13,
                          lineHeight: 1.45,
                        }}
                      >
                        No conversations yet. Send an outreach email or wait for
                        inbound replies from Resend.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 16,
                    background: "white",
                    minWidth: 0,
                    overflow: "hidden",
                    display: "grid",
                    gridTemplateRows: "auto 1fr auto",
                  }}
                >
                  {selectedThread ? (
                    <>
                      <div
                        style={{
                          padding: 13,
                          borderBottom: `1px solid ${border}`,
                          background: "#0f172a",
                          color: "white",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "flex-start",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: 18,
                                letterSpacing: "-0.03em",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {selectedThread.subject}
                            </h4>
                            <p
                              style={{
                                margin: "5px 0 0",
                                color: "#cbd5e1",
                                fontSize: 12,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {selectedThread.contactEmail} · {selectedThread.dealerName}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => beginThreadReply(selectedThread)}
                            style={{
                              border: "1px solid rgba(255,255,255,0.22)",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.08)",
                              color: "white",
                              padding: "8px 11px",
                              fontSize: 12,
                              fontWeight: 900,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Reply
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 13,
                          overflow: "auto",
                          maxHeight: 430,
                          background: "#f8fafc",
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        {selectedThread.messages.map((message) => {
                          const isOutbound = message.direction === "outbound";
                          return (
                            <article
                              key={message.id}
                              style={{
                                justifySelf: isOutbound ? "end" : "start",
                                maxWidth: "92%",
                                border: `1px solid ${border}`,
                                borderRadius: 16,
                                padding: 12,
                                background: isOutbound ? "#fff7ed" : "white",
                                boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "flex-start",
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <strong style={{ display: "block", fontSize: 13 }}>
                                    {isOutbound ? "SolaceTrade" : message.from_email}
                                  </strong>
                                  <span
                                    style={{
                                      display: "block",
                                      marginTop: 3,
                                      color: muted,
                                      fontSize: 11,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {isOutbound
                                      ? `To: ${message.to_email}`
                                      : `To: ${message.to_email}`}
                                  </span>
                                </div>
                                <span style={{ color: muted, fontSize: 11, whiteSpace: "nowrap" }}>
                                  {formatDateTime(messageTime(message))}
                                </span>
                              </div>

                              <p
                                style={{
                                  margin: "10px 0 0",
                                  color: "#334155",
                                  fontSize: 13,
                                  lineHeight: 1.55,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {message.body || "No body captured."}
                              </p>

                              <div
                                style={{
                                  display: "flex",
                                  gap: 7,
                                  flexWrap: "wrap",
                                  marginTop: 10,
                                }}
                              >
                                <Pill tone={isOutbound ? "amber" : "blue"}>
                                  {message.direction}
                                </Pill>
                                {message.status ? (
                                  <Pill tone={message.status === "failed" ? "red" : "gray"}>
                                    {message.status}
                                  </Pill>
                                ) : null}
                                {message.marketing_stage ? (
                                  <Pill tone="gray">{message.marketing_stage}</Pill>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <form
                        onSubmit={sendThreadReply}
                        style={{
                          padding: 13,
                          borderTop: `1px solid ${border}`,
                          background: "white",
                          display: "grid",
                          gap: 9,
                        }}
                      >
                        <label style={labelStyle()}>
                          Reply to {selectedThread.contactEmail}
                          <textarea
                            value={threadReplyBody}
                            onChange={(event) => setThreadReplyBody(event.target.value)}
                            placeholder="Write a reply in this thread..."
                            style={{ ...textareaStyle(), minHeight: 92 }}
                          />
                          <span style={helperStyle()}>
                            Replies also use the SolaceTrade HTML format and include the opt-out footer.
                          </span>
                        </label>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ color: muted, fontSize: 12, fontWeight: 700 }}>
                            Sends as a formatted SolaceTrade email and logs back into this thread.
                          </span>
                          <button
                            type="submit"
                            disabled={replyingThread}
                            style={{
                              border: "none",
                              borderRadius: 13,
                              background: dark,
                              color: "white",
                              padding: "10px 13px",
                              fontSize: 12,
                              fontWeight: 900,
                              cursor: replyingThread ? "wait" : "pointer",
                              opacity: replyingThread ? 0.7 : 1,
                            }}
                          >
                            {replyingThread ? "Sending..." : "Send reply"}
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div
                      style={{
                        padding: 18,
                        color: muted,
                        fontSize: 14,
                        lineHeight: 1.45,
                      }}
                    >
                      Select a thread to read and reply.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
