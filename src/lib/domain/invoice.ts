import { addMoney, allocatePayment, compareMoney, isZeroMoney, moneyString, subtractMoney } from "@/lib/money";
import { ageingBucket, calculateDueDate, daysOverdue, daysUntil } from "@/lib/dates";
import { INVOICE_STATUSES } from "@/lib/constants";

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function invoiceNetPayable(input: {
  total: string;
  withholdingTax?: string | null;
  otherDeductions?: string | null;
}): string {
  return subtractMoney(
    subtractMoney(input.total, input.withholdingTax ?? "0"),
    input.otherDeductions ?? "0",
  );
}

export function invoiceOutstanding(input: {
  total: string;
  withholdingTax?: string | null;
  otherDeductions?: string | null;
  paidAmount?: string | null;
}): string {
  const net = invoiceNetPayable(input);
  const remaining = subtractMoney(net, input.paidAmount ?? "0");
  return compareMoney(remaining, "0") < 0 ? "0.00" : remaining;
}

export function deriveInvoiceStatus(input: {
  currentStatus?: string | null;
  dueDate: string;
  outstanding: string;
  now?: Date;
}): InvoiceStatus {
  if (input.currentStatus === "draft" || input.currentStatus === "rejected" || input.currentStatus === "disputed") {
    if (!isZeroMoney(input.outstanding) || input.currentStatus !== "draft") {
      if (input.currentStatus === "rejected" || input.currentStatus === "disputed") {
        return input.currentStatus;
      }
    }
    if (input.currentStatus === "draft") return "draft";
  }

  if (isZeroMoney(input.outstanding)) return "paid";

  const overdue = daysOverdue(input.dueDate, input.now);
  if (overdue > 0) return "overdue";

  const paid = subtractMoney(
    invoiceNetPayable({
      total: addMoney(input.outstanding, "0"),
      withholdingTax: "0",
      otherDeductions: "0",
    }),
    input.outstanding,
  );
  if (compareMoney(input.outstanding, "0") > 0 && input.currentStatus === "partially_paid") {
    return "partially_paid";
  }

  if (input.currentStatus && INVOICE_STATUSES.includes(input.currentStatus as InvoiceStatus)) {
    if (input.currentStatus !== "paid" && input.currentStatus !== "overdue") {
      return input.currentStatus as InvoiceStatus;
    }
  }

  return compareMoney(paid, "0") > 0 ? "partially_paid" : "submitted";
}

export function applyPaymentToInvoice(input: {
  outstanding: string;
  paymentAmount: string;
}): {
  applied: string;
  remainingOutstanding: string;
  remainingPayment: string;
  nextStatus: InvoiceStatus;
} {
  const result = allocatePayment(input.outstanding, input.paymentAmount);
  let nextStatus: InvoiceStatus = "partially_paid";
  if (isZeroMoney(result.remainingOutstanding)) nextStatus = "paid";
  return { ...result, nextStatus };
}

export function invoiceDueDate(issueDate: string, paymentTermsDays: number, grnDate?: string | null, requiresGrn?: boolean) {
  return calculateDueDate(issueDate, paymentTermsDays, {
    startFrom: requiresGrn ? grnDate ?? issueDate : issueDate,
  });
}

export function receivablesAgeing(daysOutstanding: number) {
  return ageingBucket(Math.max(0, daysOutstanding));
}

export function canInvoicePurchaseOrder(input: {
  requiresGrn: boolean;
  hasSignedGrn: boolean;
}): { allowed: boolean; warning: string | null } {
  if (input.requiresGrn && !input.hasSignedGrn) {
    return {
      allowed: false,
      warning: "Invoice blocked — signed GRN has not been uploaded.",
    };
  }
  return { allowed: true, warning: null };
}

export function poLifecycleStage(status: string): number {
  const order = ["received", "sourcing", "delivered", "awaiting_grn", "ready_to_invoice", "invoiced", "paid"];
  const normalized =
    status === "accepted" || status === "received"
      ? "received"
      : status === "partially_delivered"
        ? "delivered"
        : status;
  const index = order.indexOf(normalized);
  return index < 0 ? 0 : index;
}

export function daysUntilDue(dueDate: string, now = new Date()) {
  return daysUntil(dueDate, now);
}

export function moneyStringSafe(value: string | null | undefined) {
  return moneyString(value ?? "0");
}
