import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
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
  const invoice = await queryOne<Record<string, string>>(
    `select i.id, i.number, i.status, i.currency, i.customer_id,
            i.issue_date::text, i.due_date::text, i.etims_reference,
            i.total::text, i.paid_amount::text, i.outstanding::text,
            c.name as customer_name, po.number as po_number
     from invoices i
     left join customers c on c.id=i.customer_id
     left join purchase_orders po on po.id=i.purchase_order_id
     where i.id=$1 and i.organization_id=$2`,
    [id, ctx.membership.organizationId],
  );
  if (!invoice) notFound();
  const followups = await query(
    `select type, follow_up_date::text, notes, promise_to_pay_date::text from payment_followups where invoice_id=$1 order by created_at desc`,
    [id],
  );
  const overdue = daysOverdue(invoice.due_date);
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <PageHeader title={invoice.number} description={invoice.customer_name} />
        <div className="rounded-xl border bg-background p-4">
          <div className="flex items-center justify-between">
            <StatusBadge value={overdue > 0 && Number(invoice.outstanding) > 0 ? "overdue" : invoice.status} />
            <div className="text-xl font-semibold">{formatMoney(invoice.outstanding, invoice.currency)} outstanding</div>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>Issued {invoice.issue_date}</div>
            <div>Due {invoice.due_date}{overdue > 0 ? ` · ${overdue} days overdue` : ""}</div>
            <div>PO {invoice.po_number || "—"}</div>
            <div>eTIMS {invoice.etims_reference || "—"}</div>
            <div>Total {formatMoney(invoice.total, invoice.currency)}</div>
            <div>Paid {formatMoney(invoice.paid_amount, invoice.currency)}</div>
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
            <input type="hidden" name="customerId" value={invoice.customer_id} />
            <Field label="Type" name="type" defaultValue="email" />
            <Field label="Contact" name="contactName" />
            <Field label="Notes" name="notes" />
            <Field label="Promise-to-pay date" name="promiseToPayDate" type="date" />
            <Field label="Next follow-up" name="nextFollowUpDate" type="date" />
            <Button type="submit" variant="outline">Save follow-up</Button>
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {(followups as Array<Record<string, string>>).map((item, index) => (
              <div key={index} className="rounded-lg bg-muted/50 p-2">
                <div className="font-medium">{item.type} · {item.follow_up_date}</div>
                <div className="text-muted-foreground">{item.notes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
