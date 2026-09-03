import { z } from "zod";

const confidence = z.enum(["confident", "review_required", "failed"]);

export const tenderRequirementSchema = z.object({
  text: z.string().min(1),
  category: z.enum([
    "preliminary",
    "technical",
    "financial",
    "personnel",
    "equipment",
    "experience",
    "forms",
    "submission",
  ]),
  mandatory: z.boolean().default(true),
  pageNumber: z.number().int().positive().nullable().optional(),
  source: z.string().nullable().optional(),
});

export const analyzeTenderSchema = z.object({
  title: z.string().min(1),
  reference: z.string().nullable().optional(),
  procuringEntity: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  closingDate: z.string().nullable().optional(),
  closingTime: z.string().nullable().optional(),
  submissionMethod: z.string().nullable().optional(),
  submissionLocation: z.string().nullable().optional(),
  tenderValue: z.string().nullable().optional(),
  tenderSecurityAmount: z.string().nullable().optional(),
  tenderValidityPeriod: z.string().nullable().optional(),
  siteVisitDate: z.string().nullable().optional(),
  preBidMeetingDate: z.string().nullable().optional(),
  clarificationDeadline: z.string().nullable().optional(),
  submissionInstructions: z.string().nullable().optional(),
  eligibilityRequirements: z.array(z.string()).default([]),
  mandatoryDocuments: z.array(z.string()).default([]),
  technicalRequirements: z.array(z.string()).default([]),
  financialRequirements: z.array(z.string()).default([]),
  formsRequiringCompletion: z.array(z.string()).default([]),
  formsRequiringSignatures: z.array(z.string()).default([]),
  formsRequiringStamps: z.array(z.string()).default([]),
  requiredCopies: z.number().int().nullable().optional(),
  serializationRequirements: z.string().nullable().optional(),
  paginationRequirements: z.string().nullable().optional(),
  tenderSecurityValidity: z.string().nullable().optional(),
  siteVisitRequirements: z.string().nullable().optional(),
  manufacturerAuthorization: z.string().nullable().optional(),
  pastExperienceRequirements: z.string().nullable().optional(),
  financialCapacityRequirements: z.string().nullable().optional(),
  personnelRequirements: z.string().nullable().optional(),
  equipmentRequirements: z.string().nullable().optional(),
  electronicPortalRequirements: z.string().nullable().optional(),
  requirements: z.array(tenderRequirementSchema).default([]),
  confidence,
  notes: z.string().nullable().optional(),
});

export const extractPurchaseOrderSchema = z.object({
  customerName: z.string().nullable().optional(),
  poNumber: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  deliveryLocation: z.string().nullable().optional(),
  deliveryDeadline: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  specialConditions: z.string().nullable().optional(),
  subtotal: z.string().nullable().optional(),
  tax: z.string().nullable().optional(),
  total: z.string().nullable().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.string(),
        unitPrice: z.string(),
        tax: z.string().nullable().optional(),
        total: z.string(),
      }),
    )
    .default([]),
  confidence,
});

export const extractInvoiceSchema = z.object({
  customerName: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  poNumber: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  etimsReference: z.string().nullable().optional(),
  subtotal: z.string().nullable().optional(),
  vat: z.string().nullable().optional(),
  withholdingTax: z.string().nullable().optional(),
  total: z.string().nullable().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.string(),
        unitPrice: z.string(),
        total: z.string(),
      }),
    )
    .default([]),
  confidence,
});

export const extractDocumentMetadataSchema = z.object({
  documentType: z.string().nullable().optional(),
  documentName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  documentNumber: z.string().nullable().optional(),
  issuingAuthority: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  confidence,
});

export const classifyDocumentSchema = z.object({
  documentType: z.string(),
  category: z.string(),
  confidence,
});

export const analyzeQuotationSchema = z.object({
  supplierName: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  validity: z.string().nullable().optional(),
  deliveryPeriod: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  warranty: z.string().nullable().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        brand: z.string().nullable().optional(),
        model: z.string().nullable().optional(),
        quantity: z.string(),
        unitPrice: z.string(),
        vat: z.string().nullable().optional(),
        total: z.string(),
      }),
    )
    .default([]),
  total: z.string().nullable().optional(),
  confidence,
});

export const generatePaymentFollowupSchema = z.object({
  subject: z.string(),
  message: z.string().min(20),
  tone: z.enum(["polite", "firm", "final"]).default("polite"),
  confidence,
});

export const runBidAuditSchema = z.object({
  readyToSubmit: z.boolean(),
  risks: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high", "critical"]),
      title: z.string(),
      detail: z.string(),
    }),
  ),
  checklist: z.array(
    z.object({
      item: z.string(),
      complete: z.boolean(),
      note: z.string().nullable().optional(),
    }),
  ),
  summary: z.string(),
  confidence,
});

export const AI_SCHEMAS = {
  analyzeTender: analyzeTenderSchema,
  extractPurchaseOrder: extractPurchaseOrderSchema,
  extractInvoice: extractInvoiceSchema,
  extractDocumentMetadata: extractDocumentMetadataSchema,
  classifyDocument: classifyDocumentSchema,
  analyzeQuotation: analyzeQuotationSchema,
  generatePaymentFollowup: generatePaymentFollowupSchema,
  runBidAudit: runBidAuditSchema,
} as const;

export type AiCapability = keyof typeof AI_SCHEMAS;

export function validateAiPayload(capability: AiCapability, payload: unknown) {
  const parsed = AI_SCHEMAS[capability].safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error, data: null };
  }
  return { ok: true as const, data: parsed.data, error: null };
}

export function stripPromptInjection(text: string): string {
  return text
    .replace(/ignore (all|any|previous|prior) instructions[\s\S]{0,200}/gi, "")
    .replace(/system prompt[\s\S]{0,120}/gi, "")
    .replace(/you are now[\s\S]{0,120}/gi, "")
    .slice(0, 120000);
}
