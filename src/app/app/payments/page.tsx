import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";

export default async function PaymentsPage() {
  const ctx = await requirePermission("payments.read");
  const rows = await query<{ id: string; payment_date: string; amount: string; method: string; bank_reference: string | null; customer: string | null }>(
    `select p.id, p.payment_date::text, p.amount::text, p.method, p.bank_reference, c.name as customer
     from payments p left join customers c on c.id=p.customer_id
     where p.organization_id=$1 and p.deleted_at is null order by p.payment_date desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader title="Payments" description="Recorded collections against invoices." />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Reference</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.payment_date}</td>
                <td className="px-3 py-2">{row.customer}</td>
                <td className="px-3 py-2 tabular-nums">{formatMoney(row.amount, ctx.membership.currency)}</td>
                <td className="px-3 py-2 capitalize">{row.method.replaceAll("_"," ")}</td>
                <td className="px-3 py-2">{row.bank_reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
