import { describe, expect, it } from "vitest";
import { addMoney, allocatePayment, applyVat, formatMoney, subtractMoney } from "@/lib/money";
import { ageingBucket, calculateDueDate, daysOverdue, expiryStatus, shouldRemind } from "@/lib/dates";
import { applyPaymentToInvoice, canInvoicePurchaseOrder, invoiceOutstanding } from "@/lib/domain/invoice";
import { calculateTenderReadiness, matchRequirementToVault } from "@/lib/domain/tender-readiness";
import { hasPermission } from "@/lib/permissions";
import { canUseEntitlement } from "@/lib/entitlements";
import { scoreQuotations } from "@/lib/domain/quotation-score";
import { validateAiPayload } from "@/lib/ai/schemas";

describe("money", () => {
  it("adds and subtracts without floating point", () => {
    expect(addMoney("18420000.00", "6250000.10")).toBe("24670000.10");
    expect(subtractMoney("10.00", "0.01")).toBe("9.99");
    expect(formatMoney("18420000", "KES")).toBe("KES 18,420,000.00");
  });

  it("calculates VAT at 16%", () => {
    expect(applyVat("1000000", "16")).toEqual({
      subtotal: "1000000.00",
      vat: "160000.00",
      total: "1160000.00",
    });
  });

  it("allocates partial payments", () => {
    expect(allocatePayment("1000.00", "250.00")).toEqual({
      applied: "250.00",
      remainingPayment: "0.00",
      remainingOutstanding: "750.00",
    });
  });
});

describe("dates and expiry", () => {
  it("calculates due dates from payment terms", () => {
    expect(calculateDueDate("2026-09-01", 30)).toBe("2026-10-01");
  });

  it("calculates overdue days", () => {
    expect(daysOverdue("2026-08-20", new Date("2026-09-03"))).toBe(14);
  });

  it("classifies expiry", () => {
    expect(expiryStatus("2026-09-26", 30, new Date("2026-09-03"))).toBe("expiring_soon");
    expect(expiryStatus("2026-07-01", 30, new Date("2026-09-03"))).toBe("expired");
    expect(shouldRemind("2026-09-10", [14, 7, 1], new Date("2026-09-03"))).toBe(7);
  });

  it("ages receivables", () => {
    expect(ageingBucket(12)).toBe("0-30");
    expect(ageingBucket(45)).toBe("31-60");
    expect(ageingBucket(120)).toBe("90+");
  });
});

describe("invoices", () => {
  it("computes outstanding after partial payment and WHT", () => {
    expect(
      invoiceOutstanding({
        total: "2400000.00",
        withholdingTax: "48000.00",
        paidAmount: "400000.00",
      }),
    ).toBe("1952000.00");
  });

  it("marks invoice paid when balance hits zero", () => {
    expect(applyPaymentToInvoice({ outstanding: "500.00", paymentAmount: "500.00" }).nextStatus).toBe("paid");
  });

  it("blocks invoicing without signed GRN when required", () => {
    expect(canInvoicePurchaseOrder({ requiresGrn: true, hasSignedGrn: false })).toEqual({
      allowed: false,
      warning: "Invoice blocked — signed GRN has not been uploaded.",
    });
  });
});

describe("tender readiness", () => {
  it("warns when mandatory items are missing even if percentage is high", () => {
    const result = calculateTenderReadiness([
      { category: "preliminary", mandatory: true, status: "complete" },
      { category: "preliminary", mandatory: true, status: "missing" },
      ...Array.from({ length: 18 }, () => ({
        category: "technical" as const,
        mandatory: false,
        status: "complete" as const,
      })),
    ]);
    expect(result.highDisqualificationRisk).toBe(true);
    expect(result.warning).toBe("HIGH DISQUALIFICATION RISK");
    expect(result.percent).toBeGreaterThan(80);
  });

  it("matches tax compliance and audited accounts without fabricating", () => {
    const vault = [
      {
        id: "tcc",
        name: "Tax Compliance Certificate",
        category: "tax",
        tags: ["tax compliance"],
        expiryDate: "2027-07-22",
      },
      {
        id: "acc-2024",
        name: "Audited accounts 2024",
        category: "audited_accounts",
        tags: [],
        coverageYear: 2024,
      },
      {
        id: "acc-2025",
        name: "Audited accounts 2025",
        category: "audited_accounts",
        tags: [],
        coverageYear: 2025,
      },
    ];
    const tax = matchRequirementToVault("Valid Tax Compliance Certificate", vault, {
      now: new Date("2026-09-03"),
    });
    expect(tax.status).toBe("complete");
    const accounts = matchRequirementToVault("Audited accounts for last 3 years", vault, {
      now: new Date("2026-09-03"),
    });
    expect(accounts.status).toBe("missing");
    expect(accounts.reason).toContain("2023");
  });
});

describe("permissions and entitlements", () => {
  it("prevents viewers from writing invoices", () => {
    expect(hasPermission("viewer", "invoices.write")).toBe(false);
    expect(hasPermission("finance", "invoices.write")).toBe(true);
    expect(hasPermission("finance", "org.billing")).toBe(false);
    expect(hasPermission("owner", "org.billing")).toBe(true);
  });

  it("gates AI usage by plan", () => {
    expect(canUseEntitlement("starter", "aiAnalysesPerMonth", 20).allowed).toBe(false);
    expect(canUseEntitlement("business", "aiAnalysesPerMonth", 20).allowed).toBe(true);
  });
});

describe("quotation scoring", () => {
  it("does not pick purely on price", () => {
    const ranked = scoreQuotations([
      {
        supplierId: "cheap",
        supplierName: "Cheap Co",
        price: "100",
        deliveryDays: 60,
        warrantyMonths: 0,
        paymentTermsDays: 0,
        technicalCompliant: false,
        supplierRating: 1,
        complianceScore: 20,
      },
      {
        supplierId: "balanced",
        supplierName: "Balanced Co",
        price: "130",
        deliveryDays: 7,
        warrantyMonths: 24,
        paymentTermsDays: 30,
        technicalCompliant: true,
        supplierRating: 5,
        complianceScore: 90,
      },
    ]);
    expect(ranked[0]?.supplierId).toBe("balanced");
  });
});

describe("AI schema validation", () => {
  it("rejects malformed tender extraction", () => {
    expect(validateAiPayload("analyzeTender", { foo: "bar" }).ok).toBe(false);
  });

  it("accepts structured tender extraction", () => {
    const result = validateAiPayload("analyzeTender", {
      title: "Supply of ICT Equipment",
      reference: "KAA/ICT/024/2026",
      procuringEntity: "Kenya Airports Authority",
      closingDate: "2026-10-15",
      closingTime: "10:00",
      requirements: [
        {
          text: "Valid Tax Compliance Certificate",
          category: "preliminary",
          mandatory: true,
        },
      ],
      confidence: "confident",
    });
    expect(result.ok).toBe(true);
  });
});
