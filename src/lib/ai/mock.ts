import { AiProvider, AiStructuredRequest } from "@/lib/ai/provider";

export class MockAiProvider implements AiProvider {
  name = "mock";

  async completeJson(request: AiStructuredRequest): Promise<unknown> {
    const userText = request.messages.map((message) => message.content).join("\n");
    if (request.capability === "analyzeTender") {
      return {
        title: extract(userText, /title[:\s]+(.+)/i) ?? "Supply and Delivery of ICT Equipment",
        reference: extract(userText, /(KAA\/[A-Z0-9/]+)/i) ?? "KAA/ICT/024/2026",
        procuringEntity: "Kenya Airports Authority",
        category: "ICT",
        closingDate: "2026-10-15",
        closingTime: "10:00",
        submissionMethod: "Electronic and hard copy",
        submissionLocation: "KAA Headquarters, Procurement Office",
        tenderValue: "12500000.00",
        tenderSecurityAmount: "250000.00",
        tenderValidityPeriod: "120 days",
        submissionInstructions: "Submit original and two copies before 10:00 AM.",
        eligibilityRequirements: ["Valid tax compliance", "CR12", "Manufacturer authorization"],
        mandatoryDocuments: [
          "Valid Tax Compliance Certificate",
          "Manufacturer Authorization Form",
          "Audited accounts for last 3 years",
        ],
        technicalRequirements: ["Brochures for offered equipment", "Warranty of 12 months"],
        financialRequirements: ["Priced bill of quantities"],
        formsRequiringCompletion: ["Form of Tender", "Confidential Business Questionnaire"],
        formsRequiringSignatures: ["Form of Tender"],
        formsRequiringStamps: ["Form of Tender"],
        requiredCopies: 3,
        serializationRequirements: "All pages serialized",
        paginationRequirements: "Paginate entire bid",
        manufacturerAuthorization: "Required from OEM",
        pastExperienceRequirements: "At least 3 similar assignments",
        financialCapacityRequirements: "Turnover of KES 20,000,000",
        personnelRequirements: "Project manager with 5 years experience",
        equipmentRequirements: "Proof of service capability",
        electronicPortalRequirements: "IFMIS / supplier portal submission",
        requirements: [
          { text: "Valid Tax Compliance Certificate", category: "preliminary", mandatory: true, pageNumber: 8 },
          { text: "CR12 dated within 3 months", category: "preliminary", mandatory: true, pageNumber: 8 },
          { text: "Manufacturer Authorization Form", category: "preliminary", mandatory: true, pageNumber: 9 },
          { text: "Audited accounts for last 3 years", category: "financial", mandatory: true, pageNumber: 11 },
          { text: "Form of Tender signed and stamped", category: "forms", mandatory: true, pageNumber: 14 },
          { text: "Technical brochures", category: "technical", mandatory: false, pageNumber: 18 },
          { text: "Original plus two copies", category: "submission", mandatory: true, pageNumber: 4 },
        ],
        confidence: "confident",
        notes: "Mock extraction used because no live AI credentials are configured.",
      };
    }
    if (request.capability === "extractPurchaseOrder") {
      return {
        customerName: "ABC Manufacturing Ltd",
        poNumber: extract(userText, /PO[-\s]?(\d{4}-\d+)/i) ? `PO-${extract(userText, /PO[-\s]?(\d{4}-\d+)/i)}` : "PO-2026-00482",
        issueDate: "2026-07-12",
        currency: "KES",
        deliveryLocation: "ABC Manufacturing, Industrial Area, Nairobi",
        deliveryDeadline: "2026-08-15",
        paymentTerms: "45 days after signed GRN and invoice",
        contactPerson: "Jane Wanjiku",
        specialConditions: "Signed GRN required before invoicing.",
        subtotal: "4181034.48",
        tax: "668965.52",
        total: "4850000.00",
        lineItems: [
          { description: "Industrial pumps", quantity: "10", unitPrice: "250000.00", tax: "400000.00", total: "2500000.00" },
          { description: "Control panels", quantity: "5", unitPrice: "336206.90", tax: "268965.52", total: "1681034.48" },
        ],
        confidence: "confident",
      };
    }
    if (request.capability === "extractInvoice") {
      return {
        customerName: "Safaricom PLC",
        invoiceNumber: "INV-2026-0084",
        poNumber: "PO-2026-00110",
        issueDate: "2026-07-21",
        dueDate: "2026-08-20",
        currency: "KES",
        etimsReference: "KRACU0123456789",
        subtotal: "2068965.52",
        vat: "331034.48",
        withholdingTax: "0.00",
        total: "2400000.00",
        lineItems: [{ description: "Network switches", quantity: "20", unitPrice: "103448.28", total: "2068965.52" }],
        confidence: "confident",
      };
    }
    if (request.capability === "extractDocumentMetadata") {
      return {
        documentType: "Tax Compliance Certificate",
        documentName: "KRA Tax Compliance Certificate",
        category: "tax",
        documentNumber: "KRA12345",
        issuingAuthority: "Kenya Revenue Authority",
        issueDate: "2026-07-22",
        expiryDate: "2027-07-22",
        country: "KE",
        tags: ["tax", "compliance", "kra"],
        confidence: "confident",
      };
    }
    if (request.capability === "classifyDocument") {
      return { documentType: "tender", category: "tender", confidence: "review_required" };
    }
    if (request.capability === "analyzeQuotation") {
      return {
        supplierName: "Nairobi ICT Distributors",
        currency: "KES",
        validity: "30 days",
        deliveryPeriod: "14 days",
        paymentTerms: "30 days",
        warranty: "12 months",
        total: "11800000.00",
        lineItems: [
          { description: "Laptop i7", brand: "Dell", model: "Latitude 5550", quantity: "50", unitPrice: "185000.00", vat: "1480000.00", total: "9250000.00" },
        ],
        confidence: "confident",
      };
    }
    if (request.capability === "generatePaymentFollowup") {
      return {
        subject: "Follow-up: Invoice INV-2026-0084 now overdue",
        message:
          "Good morning,\n\nI hope you are well. I am writing regarding invoice INV-2026-0084 for KES 2,400,000.00, issued on 21 July 2026 and due on 20 August 2026. The invoice remains outstanding.\n\nKindly confirm when payment will be processed, or share the approval status if it is still in your accounts queue.\n\nThank you,\nAccounts Receivable\nAcme Supplies Kenya Ltd",
        tone: "polite",
        confidence: "confident",
      };
    }
    if (request.capability === "runBidAudit") {
      return {
        readyToSubmit: false,
        risks: [
          {
            severity: "critical",
            title: "Manufacturer Authorization missing",
            detail: "This is a mandatory preliminary requirement and creates high disqualification risk.",
          },
          {
            severity: "high",
            title: "Audited accounts 2023 missing",
            detail: "Tender requires three years of audited accounts; 2023 is not in the vault.",
          },
        ],
        checklist: [
          { item: "All mandatory documents attached", complete: false, note: "Two mandatory items outstanding." },
          { item: "Forms signed", complete: false },
          { item: "Forms stamped", complete: false },
          { item: "Tender security attached", complete: false },
          { item: "Correct number of copies", complete: true },
          { item: "Page serialization", complete: false },
          { item: "Submission address confirmed", complete: true },
          { item: "Closing deadline confirmed", complete: true, note: "15 October 2026 at 10:00 AM" },
        ],
        summary: "Do not submit yet. Mandatory manufacturer authorization and 2023 audited accounts are outstanding.",
        confidence: "confident",
      };
    }
    return { confidence: "failed" };
  }
}

function extract(text: string, pattern: RegExp): string | null {
  return text.match(pattern)?.[1]?.trim() ?? null;
}
