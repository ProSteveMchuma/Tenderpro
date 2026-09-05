import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getOrgDoc, listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { daysOverdue } from "@/lib/dates";
import { recordPaymentAction, createFollowupAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { FollowupGenerator } from "@/components/invoices/followup-generator";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("invoices.read");
  const orgId = ctx.membership.organizationId;
  const invoiceDoc = await getOrgDoc("invoices", orgId, id);
  if (!invoiceDoc) notFound();
  const customer = invoiceDoc.customerId ? await getOrgDoc("customers", orgId, asString(invoiceDoc.customerId)) : null;
  const po = invoiceDoc.purchaseOrderId ? await getOrgDoc("purchase_orders", orgId, asString(invoiceDoc.purchaseOrderId)) : null;
  const invoice = {
    id: asString(invoiceDoc.id),
    number: asString(invoiceDoc.number),
    status: asString(invoiceDoc.status),
    currency: asString(invoiceDoc.currency, ctx.membership.currency),
    customerId: asString(invoiceDoc.customerId),
    issueDate: asString(invoiceDoc.issueDate),
    dueDate: asString(invoiceDoc.dueDate),
    etimsReference: invoiceDoc.etimsReference ? asString(invoiceDoc.etimsReference) : null,
    total: moneyString(invoiceDoc.total),
    paidAmount: moneyString(invoiceDoc.paidAmount),
    outstanding: moneyString(invoiceDoc.outstanding),
    customerName: asString(customer?.name),
    poNumber: po ? asString(po.number) : null,
  };
  const followups = (await listByOrg("payment_followups", orgId, {
    where: [{ field: "invoiceId", op: "==", value: id }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
  })).map((item) => ({
    type: asString(item.type),
    followUpDate: asString(item.followUpDate),
    notes: asString(item.notes),
  }));
  const overdue = daysOverdue(invoice.dueDate);
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <PageHeader title={invoice.number} description={invoice.customerName} />
        <div className="rounded-xl border bg-background p-4">
          <div className="flex items-center justify-between">
            <StatusBadge value={overdue > 0 && Number(invoice.outstanding) > 0 ? "overdue" : invoice.status} />
            <div className="text-xl font-semibold">{formatMoney(invoice.outstanding, invoice.currency)} outstanding</div>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>Issued {invoice.issueDate}</div>
            <div>Due {invoice.dueDate}{overdue > 0 ? ` · ${overdue} days overdue` : ""}</div>
            <div>PO {invoice.poNumber || "—"}</div>
            <div>eTIMS {invoice.etimsReference || "—"}</div>
            <div>Total {formatMoney(invoice.total, invoice.currency)}</div>
            <div>Paid {formatMoney(invoice.paidAmount, invoice.currency)}</div>
          </dl>
        </div>
        {Number(invoice.outstanding) > 0 ? (
          <form action={recordPaymentAction} className="mt-6 rounded-xl border bg-background p-4">
            <h2 className="font-medium">Record payment</h2>
            <input type="hidden" name="invoiceId" value={id} />
            <Field label="Amount" name="amount" defaultValue={invoice.outstanding} />
            <Field label="Date" name="paymentDate" type="date" />
            <Field label="Method" name="method" defaultValue="bank_transfer" />
            <Field label="Bank reference" name="bankReference" />
            <Field label="M-Pesa reference" name="mpesaReference" />
            <Button type="submit">Allocate payment</Button>
          </form>
        ) : null}
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border bg-background p-4">
          <h2 className="font-medium">Collection follow-up</h2>
          <FollowupGenerator invoiceId={id} />
          <form action={createFollowupAction} className="mt-4">
            <input type="hidden" name="invoiceId" value={id} />
            <input type="hidden" name="customerId" value={invoice.customerId} />
            <Field label="Type" name="type" defaultValue="email" />
            <Field label="Contact" name="contactName" />
            <Field label="Notes" name="notes" />
            <Field label="Promise-to-pay date" name="promiseToPayDate" type="date" />
            <Field label="Next follow-up" name="nextFollowUpDate" type="date" />
            <Button type="submit" variant="outline">Save follow-up</Button>
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {followups.map((item, index) => (
              <div key={index} className="rounded-lg bg-muted/50 p-2">
                <div className="font-medium">{item.type} · {item.followUpDate}</div>
                <div className="text-muted-foreground">{item.notes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
