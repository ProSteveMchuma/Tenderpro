import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { AlertBanner, PageHeader, Panel, PanelHeader, StatusBadge } from "@/components/shared/chrome";
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
  const unpaid = Number(invoice.outstanding) > 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <PageHeader
          eyebrow="Invoice"
          title={invoice.number}
          description={invoice.customer_name}
          action={<StatusBadge value={overdue > 0 && unpaid ? "overdue" : invoice.status} />}
        />
        {overdue > 0 && unpaid ? (
          <div className="mb-4">
            <AlertBanner tone="danger" title={`${overdue} days overdue`}>
              {formatMoney(invoice.outstanding, invoice.currency)} is still outstanding. Record a follow-up or allocate a payment.
            </AlertBanner>
          </div>
        ) : null}
        <Panel className="p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">{formatMoney(invoice.outstanding, invoice.currency)}</div>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Issued</dt>
              <dd>{invoice.issue_date}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due</dt>
              <dd>
                {invoice.due_date}
                {overdue > 0 ? ` · ${overdue} days overdue` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">PO</dt>
              <dd>{invoice.po_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">eTIMS</dt>
              <dd>{invoice.etims_reference || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="tabular-nums">{formatMoney(invoice.total, invoice.currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="tabular-nums">{formatMoney(invoice.paid_amount, invoice.currency)}</dd>
            </div>
          </dl>
        </Panel>
        {unpaid ? (
          <Panel className="mt-6 p-5">
            <h2 className="text-sm font-semibold">Record payment</h2>
            <form action={recordPaymentAction} className="mt-3">
              <input type="hidden" name="invoiceId" value={id} />
              <Field label="Amount" name="amount" defaultValue={invoice.outstanding} />
              <Field label="Date" name="paymentDate" type="date" />
              <Field label="Method" name="method" defaultValue="bank_transfer" />
              <Field label="Bank reference" name="bankReference" />
              <Field label="M-Pesa reference" name="mpesaReference" />
              <Button type="submit">Allocate payment</Button>
            </form>
          </Panel>
        ) : null}
      </div>
      <div className="space-y-4">
        <Panel>
          <PanelHeader title="Collection follow-up" description="Log every chase so the next person knows what to do." />
          <div className="p-4">
            <FollowupGenerator invoiceId={id} />
            <form action={createFollowupAction} className="mt-4">
              <input type="hidden" name="invoiceId" value={id} />
              <input type="hidden" name="customerId" value={invoice.customer_id} />
              <Field label="Type" name="type" defaultValue="email" />
              <Field label="Contact" name="contactName" />
              <Field label="Notes" name="notes" />
              <Field label="Promise-to-pay date" name="promiseToPayDate" type="date" />
              <Field label="Next follow-up" name="nextFollowUpDate" type="date" />
              <Button type="submit" variant="outline">
                Save follow-up
              </Button>
            </form>
            <div className="mt-4 space-y-2 text-sm">
              {(followups as Array<Record<string, string>>).map((item, index) => (
                <div key={index} className="rounded-lg bg-muted/50 p-2.5">
                  <div className="font-medium capitalize">
                    {item.type} · {item.follow_up_date}
                  </div>
                  <div className="text-muted-foreground">{item.notes}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
