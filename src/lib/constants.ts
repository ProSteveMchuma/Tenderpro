export const APP_NAME = "SupplierOS Africa";
export const APP_TAGLINE = "From Tender to Payment.";

export const DEFAULT_COUNTRY = "KE";
export const DEFAULT_CURRENCY = "KES";
export const DEFAULT_TIMEZONE = "Africa/Nairobi";
export const DEFAULT_VAT_RATE = "16.00";
export const TRIAL_DAYS = 14;

export const COUNTRIES = [
  { code: "KE", name: "Kenya", currency: "KES", timezone: "Africa/Nairobi", vat: "16.00" },
  { code: "UG", name: "Uganda", currency: "UGX", timezone: "Africa/Kampala", vat: "18.00" },
  { code: "TZ", name: "Tanzania", currency: "TZS", timezone: "Africa/Dar_es_Salaam", vat: "18.00" },
  { code: "RW", name: "Rwanda", currency: "RWF", timezone: "Africa/Kigali", vat: "18.00" },
  { code: "ZM", name: "Zambia", currency: "ZMW", timezone: "Africa/Lusaka", vat: "16.00" },
  { code: "GH", name: "Ghana", currency: "GHS", timezone: "Africa/Accra", vat: "15.00" },
  { code: "NG", name: "Nigeria", currency: "NGN", timezone: "Africa/Lagos", vat: "7.50" },
  { code: "ZA", name: "South Africa", currency: "ZAR", timezone: "Africa/Johannesburg", vat: "15.00" },
] as const;

export const CURRENCIES = ["KES", "UGX", "TZS", "RWF", "ZMW", "GHS", "NGN", "ZAR", "USD", "EUR", "GBP"] as const;

export const ROLES = ["owner", "admin", "procurement", "finance", "operations", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const BUSINESS_TYPES = [
  "General Supplier",
  "Contractor",
  "Consultancy",
  "ICT",
  "Construction",
  "Automotive",
  "Energy",
  "Healthcare",
  "Agriculture",
  "Logistics",
  "Professional Services",
  "Other",
] as const;

export const ONBOARDING_GOALS = [
  { id: "tenders", label: "Manage tenders" },
  { id: "invoices", label: "Track invoices" },
  { id: "payments", label: "Track payments" },
  { id: "compliance", label: "Manage compliance" },
  { id: "purchase_orders", label: "Manage purchase orders" },
  { id: "suppliers", label: "Manage suppliers" },
  { id: "quotations", label: "Manage quotations" },
  { id: "deliveries", label: "Manage deliveries" },
] as const;

export const CUSTOMER_TYPES = [
  "government",
  "parastatal",
  "corporate",
  "ngo",
  "school",
  "hospital",
  "private_business",
  "other",
] as const;

export const OPPORTUNITY_STAGES = [
  "identified",
  "qualified",
  "preparing_bid",
  "submitted",
  "under_evaluation",
  "awarded",
  "lost",
  "cancelled",
] as const;

export const TENDER_STATUSES = [
  "draft",
  "reviewing",
  "preparing",
  "ready",
  "submitted",
  "under_evaluation",
  "awarded",
  "lost",
  "cancelled",
] as const;

export const REQUIREMENT_CATEGORIES = [
  "preliminary",
  "technical",
  "financial",
  "personnel",
  "equipment",
  "experience",
  "forms",
  "submission",
] as const;

export const REQUIREMENT_STATUSES = [
  "missing",
  "available",
  "needs_update",
  "expiring",
  "needs_signature",
  "needs_stamp",
  "complete",
  "not_applicable",
  "review_required",
] as const;

export const VAULT_CATEGORIES = [
  "company_registration",
  "tax",
  "licences",
  "certifications",
  "insurance",
  "banking",
  "audited_accounts",
  "personnel",
  "equipment",
  "experience",
  "manufacturer_authorizations",
  "policies",
  "references",
  "other",
] as const;

export const DOCUMENT_EXPIRY_STATUSES = ["valid", "expiring_soon", "expired", "missing"] as const;

export const DEFAULT_REMINDER_DAYS = [90, 60, 30, 14, 7, 1] as const;

export const PO_STATUSES = [
  "received",
  "accepted",
  "sourcing",
  "partially_delivered",
  "delivered",
  "awaiting_grn",
  "ready_to_invoice",
  "invoiced",
  "closed",
  "cancelled",
] as const;

export const DELIVERY_STATUSES = [
  "scheduled",
  "in_transit",
  "delivered",
  "partially_delivered",
  "rejected",
  "completed",
] as const;

export const GRN_STATUSES = ["draft", "submitted", "signed", "disputed", "complete"] as const;

export const INVOICE_STATUSES = [
  "draft",
  "ready_to_submit",
  "submitted",
  "acknowledged",
  "under_approval",
  "approved",
  "partially_paid",
  "paid",
  "overdue",
  "rejected",
  "disputed",
] as const;

export const RFQ_STATUSES = [
  "draft",
  "sent",
  "responses_received",
  "evaluation",
  "approved",
  "po_created",
  "closed",
] as const;

export const TASK_STATUSES = ["open", "in_progress", "blocked", "complete"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const FOLLOWUP_TYPES = ["email", "phone", "whatsapp", "meeting", "portal_update", "other"] as const;

export const PAYMENT_METHODS = ["bank_transfer", "mpesa", "cheque", "card", "cash", "other"] as const;

export const AI_CONFIDENCE = ["confident", "review_required", "failed"] as const;

export const ALLOWED_UPLOAD_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "text/plain",
] as const;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const PLAN_IDS = ["starter", "business", "pro", "consultant"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_PRICES_KES = {
  starter: { monthly: 1500, annual: 15000 },
  business: { monthly: 4500, annual: 45000 },
  pro: { monthly: 9900, annual: 99000 },
  consultant: { monthly: 19900, annual: 199000 },
} as const;
