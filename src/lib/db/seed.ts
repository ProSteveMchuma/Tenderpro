import bcrypt from "bcryptjs";
import { addDaysIso } from "@/lib/dates";
import { invoiceOutstanding } from "@/lib/domain/invoice";
import { calculateTenderReadiness, matchRequirementToVault } from "@/lib/domain/tender-readiness";
import { createDoc, docById, docs, listByOrg, patchDoc, saveDoc } from "@/lib/db/repo";
import { getDatabaseDriver } from "@/lib/db/client";
import { DEMO } from "@/lib/db/demo";
import { newId, nowIso } from "@/lib/db/types";

export { DEMO };

async function seedFirestoreDemoData() {
  const existing = await docById("organizations", DEMO.acme);
  if (existing) return;

  const passwordHash = await bcrypt.hash(DEMO.password, 10);
  const trialEnd = addDaysIso(new Date(), 14);
  const createdAt = nowIso();

  const profiles = [
    { id: DEMO.steve, email: "steve@acmesupplies.ke", fullName: "Steve Mwangi", phone: "+254700000001" },
    { id: DEMO.rose, email: "rose@acmesupplies.ke", fullName: "Rose Njeri", phone: "+254700000002" },
    { id: DEMO.darius, email: "darius@acmesupplies.ke", fullName: "Darius Otieno", phone: "+254700000003" },
    { id: DEMO.riftOwner, email: "nina@riftvalley.ke", fullName: "Nina Chebet", phone: "+254700000004" },
  ];
  for (const profile of profiles) {
    await saveDoc("profiles", profile.id, {
      ...profile,
      emailLower: profile.email.toLowerCase(),
      country: "KE",
      passwordHash,
      emailVerifiedAt: createdAt,
      deletedAt: null,
    });
  }

  await saveDoc("organizations", DEMO.acme, {
    name: "Acme Supplies Kenya Ltd",
    legalName: "Acme Supplies Kenya Ltd",
    tradingName: "Acme Supplies",
    registrationNumber: "PVT-2020-44821",
    taxPin: "P051234567K",
    country: "KE",
    currency: "KES",
    timezone: "Africa/Nairobi",
    vatRegistered: true,
    vatRate: "16.00",
    phone: "+254711223344",
    email: "accounts@acmesupplies.ke",
    website: "https://acmesupplies.ke",
    address: "Industrial Area, Nairobi",
    businessType: "General Supplier",
    onboardingGoals: ["tenders", "invoices", "payments", "compliance", "purchase_orders"],
    onboardingCompletedAt: createdAt,
    createdBy: DEMO.steve,
    deletedAt: null,
  });
  await saveDoc("organizations", DEMO.rift, {
    name: "Rift Valley Traders Ltd",
    legalName: "Rift Valley Traders Ltd",
    tradingName: "Rift Traders",
    registrationNumber: "PVT-2018-11902",
    taxPin: "P059999999K",
    country: "KE",
    currency: "KES",
    timezone: "Africa/Nairobi",
    vatRegistered: true,
    vatRate: "16.00",
    phone: "+254722000111",
    email: "hello@riftvalley.ke",
    website: null,
    address: "Nakuru",
    businessType: "General Supplier",
    onboardingGoals: [],
    onboardingCompletedAt: createdAt,
    createdBy: DEMO.riftOwner,
    deletedAt: null,
  });

  const members = [
    { organizationId: DEMO.acme, userId: DEMO.steve, role: "owner" },
    { organizationId: DEMO.acme, userId: DEMO.rose, role: "procurement" },
    { organizationId: DEMO.acme, userId: DEMO.darius, role: "finance" },
    { organizationId: DEMO.acme, userId: DEMO.riftOwner, role: "viewer" },
    { organizationId: DEMO.rift, userId: DEMO.riftOwner, role: "owner" },
  ];
  for (const member of members) {
    await createDoc("organization_members", {
      ...member,
      status: "active",
      deletedAt: null,
    });
  }

  for (const [orgId, planId] of [
    [DEMO.acme, "business"],
    [DEMO.rift, "starter"],
  ] as const) {
    await createDoc("subscriptions", {
      organizationId: orgId,
      planId,
      status: "trialing",
      trialEndsAt: trialEnd,
      currentPeriodEnd: trialEnd,
      provider: "development",
    });
    await saveDoc("organization_settings", orgId, {
      organizationId: orgId,
      reminderDays: [90, 60, 30, 14, 7, 1],
    });
  }

  const customers = [
    {
      id: DEMO.customers.kaa,
      name: "Kenya Airports Authority",
      type: "parastatal",
      industry: "Aviation",
      taxPin: "P051111111A",
      paymentTermsDays: 30,
      address: "KAA Headquarters, Nairobi",
      phone: "+254206611000",
      email: "procurement@kaa.go.ke",
      notes: "Strategic aviation buyer",
    },
    {
      id: DEMO.customers.safaricom,
      name: "Safaricom PLC",
      type: "corporate",
      industry: "Telecommunications",
      taxPin: "P051234000S",
      paymentTermsDays: 30,
      address: "Safaricom House, Waiyaki Way",
      phone: "+254722000000",
      email: "ap@safaricom.co.ke",
      notes: "Enterprise network supplies",
    },
    {
      id: DEMO.customers.abc,
      name: "ABC Manufacturing Ltd",
      type: "private_business",
      industry: "Manufacturing",
      taxPin: "P058888888M",
      paymentTermsDays: 45,
      address: "Industrial Area, Nairobi",
      phone: "+254733221100",
      email: "procurement@abcmanufacturing.co.ke",
      notes: "Requires signed GRN before invoice",
    },
  ];
  for (const customer of customers) {
    await saveDoc("customers", customer.id, {
      ...customer,
      organizationId: DEMO.acme,
      defaultCurrency: "KES",
      deletedAt: null,
    });
  }

  await createDoc("customer_contacts", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.kaa,
    name: "Mercy Achieng",
    title: "Procurement Officer",
    email: "mercy.achieng@kaa.go.ke",
    phone: "+254722111222",
    isPrimary: true,
  });
  await createDoc("customer_contacts", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.safaricom,
    name: "Peter Kamau",
    title: "Accounts Payable",
    email: "peter.kamau@safaricom.co.ke",
    phone: "+254722333444",
    isPrimary: true,
  });
  await createDoc("customer_contacts", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.abc,
    name: "Jane Wanjiku",
    title: "Buying Manager",
    email: "jane.wanjiku@abcmanufacturing.co.ke",
    phone: "+254733221101",
    isPrimary: true,
  });

  const vaultSeed = [
    {
      name: "Certificate of Incorporation",
      category: "company_registration",
      documentNumber: "C.123456",
      issuingAuthority: "Registrar of Companies",
      issueDate: "2018-03-12",
      expiryDate: null,
      coverageYear: null,
      tags: ["registration"],
      status: "valid",
    },
    {
      name: "KRA PIN Certificate",
      category: "tax",
      documentNumber: "P051234567K",
      issuingAuthority: "Kenya Revenue Authority",
      issueDate: "2018-04-01",
      expiryDate: null,
      coverageYear: null,
      tags: ["pin"],
      status: "valid",
    },
    {
      name: "Tax Compliance Certificate",
      category: "tax",
      documentNumber: "KRA12345",
      issuingAuthority: "Kenya Revenue Authority",
      issueDate: "2026-07-22",
      expiryDate: "2027-07-22",
      coverageYear: null,
      tags: ["tax compliance", "kra"],
      status: "valid",
    },
    {
      name: "Business Permit",
      category: "licences",
      documentNumber: "NCC-88921",
      issuingAuthority: "Nairobi City County",
      issueDate: "2026-01-10",
      expiryDate: "2026-09-26",
      coverageYear: null,
      tags: ["permit"],
      status: "expiring_soon",
    },
    {
      name: "Audited accounts 2024",
      category: "audited_accounts",
      documentNumber: "AA-2024",
      issuingAuthority: "PWC Kenya",
      issueDate: "2025-04-30",
      expiryDate: null,
      coverageYear: 2024,
      tags: ["accounts"],
      status: "valid",
    },
    {
      name: "Audited accounts 2025",
      category: "audited_accounts",
      documentNumber: "AA-2025",
      issuingAuthority: "PWC Kenya",
      issueDate: "2026-04-30",
      expiryDate: null,
      coverageYear: 2025,
      tags: ["accounts"],
      status: "valid",
    },
    {
      name: "CR12",
      category: "company_registration",
      documentNumber: "CR12-2026",
      issuingAuthority: "Registrar of Companies",
      issueDate: "2026-06-01",
      expiryDate: "2026-12-01",
      coverageYear: null,
      tags: ["cr12"],
      status: "valid",
    },
  ];
  for (const doc of vaultSeed) {
    await createDoc("company_documents", {
      ...doc,
      organizationId: DEMO.acme,
      country: "KE",
      deletedAt: null,
    });
  }

  await createDoc("opportunities", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.kaa,
    title: "ICT equipment framework",
    estimatedValue: "12500000",
    probability: 70,
    expectedCloseDate: "2026-10-15",
    source: "Tender portal",
    ownerId: DEMO.steve,
    stage: "preparing_bid",
    notes: "Linked to KAA ICT tender",
    deletedAt: null,
  });
  await createDoc("opportunities", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.abc,
    title: "Spare parts annual supply",
    estimatedValue: "6200000",
    probability: 40,
    expectedCloseDate: "2026-11-30",
    source: "Referral",
    ownerId: DEMO.steve,
    stage: "qualified",
    notes: "Awaiting RFQ",
    deletedAt: null,
  });
  await createDoc("opportunities", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.safaricom,
    title: "Network refresh phase 2",
    estimatedValue: "8900000",
    probability: 55,
    expectedCloseDate: "2026-09-30",
    source: "Repeat business",
    ownerId: DEMO.steve,
    stage: "submitted",
    notes: "Proposal with Safaricom",
    deletedAt: null,
  });

  await saveDoc("tenders", DEMO.tender, {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.kaa,
    title: "Supply and Delivery of ICT Equipment",
    reference: "KAA/ICT/024/2026",
    procuringEntity: "Kenya Airports Authority",
    category: "ICT",
    closingDate: "2026-10-15",
    closingTime: "10:00",
    timezone: "Africa/Nairobi",
    closingAt: "2026-10-15T07:00:00.000Z",
    submissionMethod: "Electronic and hard copy",
    submissionLocation: "KAA Headquarters, Procurement Office",
    tenderValue: "12500000",
    currency: "KES",
    tenderSecurityAmount: "250000",
    tenderValidityPeriod: "120 days",
    status: "preparing",
    assignedTo: DEMO.rose,
    readinessPercent: 0,
    deletedAt: null,
  });

  const vault = await listByOrg("company_documents", DEMO.acme);
  const vaultDocs = vault.map((doc) => ({
    id: String(doc.id),
    name: String(doc.name),
    category: String(doc.category),
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    expiryDate: doc.expiryDate ? String(doc.expiryDate) : null,
    coverageYear: doc.coverageYear == null ? null : Number(doc.coverageYear),
  }));

  const requirementTexts = [
    ["Valid Tax Compliance Certificate", "preliminary", true],
    ["CR12 dated within 3 months", "preliminary", true],
    ["Manufacturer Authorization Form", "preliminary", true],
    ["Audited accounts for last 3 years", "financial", true],
    ["Form of Tender signed and stamped", "forms", true],
    ["Technical brochures", "technical", false],
    ["Original plus two copies", "submission", true],
  ] as const;

  for (const [text, category, mandatory] of requirementTexts) {
    const match = matchRequirementToVault(text, vaultDocs, { now: new Date("2026-09-03") });
    await createDoc("tender_requirements", {
      organizationId: DEMO.acme,
      tenderId: DEMO.tender,
      requirementText: text,
      category,
      sourceDocument: "Tender document",
      pageNumber: 8,
      mandatory,
      status: match.status,
      evidenceDocumentId: match.evidenceDocumentId,
      matchReason: match.reason,
      confidence: match.confidence,
    });
  }

  const reqs = await docs("tender_requirements", {
    where: [{ field: "tenderId", op: "==", value: DEMO.tender }],
  });
  const readiness = calculateTenderReadiness(
    reqs.map((row) => ({
      category: String(row.category),
      mandatory: Boolean(row.mandatory),
      status: String(row.status),
    })),
  );
  await patchDoc("tenders", DEMO.tender, { readinessPercent: readiness.percent });

  await saveDoc("purchase_orders", DEMO.poMissingGrn, {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.abc,
    number: "PO-2026-00482",
    issueDate: "2026-07-12",
    currency: "KES",
    paymentTermsDays: 45,
    paymentTermsText: "45 days after signed GRN and invoice",
    deliveryLocation: "ABC Manufacturing, Industrial Area, Nairobi",
    deliveryDeadline: "2026-08-15",
    contactPerson: "Jane Wanjiku",
    specialConditions: "Signed GRN required before invoicing.",
    subtotal: "4181034.48",
    tax: "668965.52",
    total: "4850000.00",
    status: "delivered",
    requiresGrn: true,
    deletedAt: null,
  });
  await createDoc("purchase_orders", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.safaricom,
    number: "PO-2026-00110",
    issueDate: "2026-07-01",
    currency: "KES",
    paymentTermsDays: 30,
    paymentTermsText: "30 days from invoice",
    deliveryLocation: "Safaricom House",
    deliveryDeadline: "2026-07-20",
    contactPerson: "Peter Kamau",
    specialConditions: null,
    subtotal: "2068965.52",
    tax: "331034.48",
    total: "2400000.00",
    status: "invoiced",
    requiresGrn: true,
    deletedAt: null,
  });
  await createDoc("purchase_orders", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.kaa,
    number: "PO-2026-00201",
    issueDate: "2026-08-10",
    currency: "KES",
    paymentTermsDays: 30,
    paymentTermsText: "30 days",
    deliveryLocation: "KAA Stores",
    deliveryDeadline: "2026-09-20",
    contactPerson: "Mercy Achieng",
    specialConditions: null,
    subtotal: "3100000",
    tax: "496000",
    total: "3596000.00",
    status: "sourcing",
    requiresGrn: true,
    deletedAt: null,
  });

  await createDoc("purchase_order_items", {
    organizationId: DEMO.acme,
    purchaseOrderId: DEMO.poMissingGrn,
    description: "Industrial pumps",
    quantity: "10",
    unitPrice: "250000",
    tax: "400000",
    total: "2500000",
  });
  await createDoc("purchase_order_items", {
    organizationId: DEMO.acme,
    purchaseOrderId: DEMO.poMissingGrn,
    description: "Control panels",
    quantity: "5",
    unitPrice: "336206.90",
    tax: "268965.52",
    total: "1681034.48",
  });

  await createDoc("deliveries", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.abc,
    purchaseOrderId: DEMO.poMissingGrn,
    number: "DN-2026-00482",
    deliveryDate: "2026-08-14",
    location: "ABC Manufacturing, Industrial Area",
    deliveredBy: "James Kariuki",
    receivedBy: "Store clerk",
    status: "delivered",
    notes: "Awaiting signed GRN",
    deletedAt: null,
  });

  const overdueOutstanding = invoiceOutstanding({
    total: "2400000.00",
    withholdingTax: "0",
    paidAmount: "0",
  });

  await saveDoc("invoices", DEMO.invoiceOverdue, {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.safaricom,
    purchaseOrderId: null,
    number: "INV-2026-0084",
    issueDate: "2026-07-21",
    dueDate: "2026-08-20",
    currency: "KES",
    subtotal: "2068965.52",
    vat: "331034.48",
    withholdingTax: "0",
    total: "2400000",
    paidAmount: "0",
    outstanding: overdueOutstanding,
    etimsReference: "KRACU0123456789",
    status: "overdue",
    nextAction: "Call accounts payable",
    deletedAt: null,
  });
  await createDoc("invoices", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.kaa,
    number: "INV-2026-0091",
    issueDate: "2026-08-18",
    dueDate: "2026-09-17",
    currency: "KES",
    subtotal: "1500000",
    vat: "240000",
    withholdingTax: "0",
    total: "1740000",
    paidAmount: "0",
    outstanding: "1740000",
    etimsReference: null,
    status: "submitted",
    nextAction: "Confirm acknowledgement",
    deletedAt: null,
  });
  await createDoc("invoices", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.abc,
    number: "INV-2026-0072",
    issueDate: "2026-06-01",
    dueDate: "2026-07-01",
    currency: "KES",
    subtotal: "5000000",
    vat: "800000",
    withholdingTax: "0",
    total: "5800000",
    paidAmount: "5800000",
    outstanding: "0",
    etimsReference: "KRACU000111",
    status: "paid",
    nextAction: null,
    deletedAt: null,
  });

  await createDoc("invoice_items", {
    organizationId: DEMO.acme,
    invoiceId: DEMO.invoiceOverdue,
    description: "Network switches",
    quantity: "20",
    unitPrice: "103448.28",
    total: "2068965.52",
  });

  await createDoc("payments", {
    organizationId: DEMO.acme,
    customerId: DEMO.customers.abc,
    paymentDate: "2026-07-12",
    amount: "5800000",
    currency: "KES",
    method: "bank_transfer",
    bankReference: "FT26212KE",
    notes: "Settlement for INV-2026-0072",
    deletedAt: null,
  });

  await createDoc("suppliers", {
    organizationId: DEMO.acme,
    name: "Nairobi ICT Distributors",
    category: "ICT",
    contactName: "Ali Hassan",
    phone: "+254700111222",
    email: "sales@nairobict.co.ke",
    taxPin: "P051001001K",
    location: "Nairobi",
    productsServices: "Laptops, switches, printers",
    paymentTermsDays: 30,
    rating: "4.6",
    notes: "Preferred ICT wholesaler",
    deletedAt: null,
  });
  await createDoc("suppliers", {
    organizationId: DEMO.acme,
    name: "Mombasa Industrial Parts",
    category: "Industrial",
    contactName: "Grace Muli",
    phone: "+254700333444",
    email: "quotes@mombasaindustrial.co.ke",
    taxPin: "P052002002M",
    location: "Mombasa",
    productsServices: "Pumps and control gear",
    paymentTermsDays: 45,
    rating: "3.8",
    notes: "Longer lead times",
    deletedAt: null,
  });

  await createDoc("rfqs", {
    organizationId: DEMO.acme,
    number: "RFQ-2026-018",
    title: "ICT accessories for KAA bid",
    description: "Mice, docking stations and cables",
    requiredDeliveryDate: "2026-10-01",
    location: "Nairobi",
    currency: "KES",
    deadline: "2026-09-20T09:00:00.000Z",
    status: "sent",
    deletedAt: null,
  });

  const tasks = [
    {
      title: "Request GRN for PO-2026-00482",
      description: "Invoice blocked until signed GRN is uploaded",
      entityType: "purchase_order",
      entityId: DEMO.poMissingGrn,
      assignedTo: DEMO.steve,
      priority: "urgent",
      dueDate: "2026-09-05",
    },
    {
      title: "Follow up overdue INV-2026-0084",
      description: "KES 2,400,000 overdue from Safaricom",
      entityType: "invoice",
      entityId: DEMO.invoiceOverdue,
      assignedTo: DEMO.darius,
      priority: "high",
      dueDate: "2026-09-04",
    },
    {
      title: "Obtain Manufacturer Authorization",
      description: "Mandatory for KAA/ICT/024/2026",
      entityType: "tender",
      entityId: DEMO.tender,
      assignedTo: DEMO.rose,
      priority: "urgent",
      dueDate: "2026-09-20",
    },
    {
      title: "Upload 2023 audited accounts",
      description: "Required for three-year financial capacity",
      entityType: "tender",
      entityId: DEMO.tender,
      assignedTo: DEMO.steve,
      priority: "high",
      dueDate: "2026-09-25",
    },
    {
      title: "Renew Nairobi business permit",
      description: "Expires 26 September 2026",
      entityType: "company_document",
      entityId: null,
      assignedTo: DEMO.steve,
      priority: "medium",
      dueDate: "2026-09-19",
    },
  ];
  for (const task of tasks) {
    await createDoc("tasks", { ...task, organizationId: DEMO.acme, status: "open", deletedAt: null });
  }

  await createDoc("notifications", {
    organizationId: DEMO.acme,
    userId: DEMO.steve,
    type: "invoice_overdue",
    title: "Invoice INV-2026-0084 is overdue",
    body: "Safaricom invoice of KES 2,400,000 is past due.",
    entityType: "invoice",
    entityId: DEMO.invoiceOverdue,
    readAt: null,
  });
  await createDoc("notifications", {
    organizationId: DEMO.acme,
    userId: DEMO.steve,
    type: "grn_missing",
    title: "GRN missing for PO-2026-00482",
    body: "Delivery is complete but the signed GRN has not been uploaded.",
    entityType: "purchase_order",
    entityId: DEMO.poMissingGrn,
    readAt: null,
  });
  await createDoc("notifications", {
    organizationId: DEMO.acme,
    userId: DEMO.steve,
    type: "document_expiry",
    title: "Business Permit expires in 23 days",
    body: "Renew before 26 September 2026.",
    entityType: "company_document",
    entityId: null,
    readAt: null,
  });
  await createDoc("notifications", {
    organizationId: DEMO.acme,
    userId: DEMO.rose,
    type: "tender_deadline",
    title: "KAA tender closes 15 October 2026 at 10:00 AM",
    body: "Mandatory manufacturer authorization is still missing.",
    entityType: "tender",
    entityId: DEMO.tender,
    readAt: null,
  });

  await createDoc("activity_events", {
    organizationId: DEMO.acme,
    actorId: DEMO.steve,
    actorName: "Steve Mwangi",
    entityType: "purchase_order",
    entityId: DEMO.poMissingGrn,
    action: "uploaded",
    summary: "Steve uploaded PO-2026-00482.",
  });
  await createDoc("activity_events", {
    organizationId: DEMO.acme,
    actorId: DEMO.rose,
    actorName: "Rose Njeri",
    entityType: "tender",
    entityId: DEMO.tender,
    action: "status_changed",
    summary: "Rose changed Tender KAA/ICT/024/2026 status to Preparing.",
  });
  await createDoc("activity_events", {
    organizationId: DEMO.acme,
    actorId: DEMO.darius,
    actorName: "Darius Otieno",
    entityType: "invoice",
    entityId: DEMO.invoiceOverdue,
    action: "created",
    summary: "Darius created invoice INV-2026-0084.",
  });
  await createDoc("activity_events", {
    organizationId: DEMO.acme,
    actorId: DEMO.darius,
    actorName: "Darius Otieno",
    entityType: "payment_followup",
    entityId: DEMO.invoiceOverdue,
    action: "created",
    summary: "Darius added a payment follow-up.",
  });

  await createDoc("payment_followups", {
    organizationId: DEMO.acme,
    invoiceId: DEMO.invoiceOverdue,
    customerId: DEMO.customers.safaricom,
    type: "email",
    followUpDate: "2026-08-28",
    contactName: "Peter Kamau",
    notes: "Sent first reminder. Promised to check with AP.",
    nextFollowUpDate: "2026-09-04",
    createdBy: DEMO.darius,
  });
}

export async function seedDemoData() {
  if (getDatabaseDriver() === "firestore") {
    await seedFirestoreDemoData();
    return;
  }
  // Legacy SQL seed path retained for DATABASE_DRIVER=postgres|pglite.
  const { seedSqlDemoData } = await import("@/lib/db/seed-sql");
  await seedSqlDemoData();
}

// Keep a stable export used by tooling.
export { newId };
