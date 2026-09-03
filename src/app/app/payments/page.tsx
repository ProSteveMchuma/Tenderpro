import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";

export default async function PaymentsPage() {
  const ctx = await requirePermission("payments.read");
  const orgId = ctx.membership.organizationId;
  const payments = await listByOrg("payments", orgId, { orderBy: [{ field: "paymentDate", direction: "desc" }] });
  const customers = await listByOrg("customers", orgId);
  const customerById = new Map(customers.map((row) => [asString(row.id), asString(row.name)]));
  const rows = payments.map((row) => ({
    id: asString(row.id),
    paymentDate: asString(row.paymentDate),
    amount: moneyString(row.amount),
    method: asString(row.method),
    bankReference: row.bankReference ? asString(row.bankReference) : null,
    customer: customerById.get(asString(row.customerId)) ?? null,
  }));
  return (
    <div>
      <PageHeader title="Payments" description="Recorded collections against invoices." />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Reference</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.paymentDate}</td>
                <td className="px-3 py-2">{row.customer}</td>
                <td className="px-3 py-2 tabular-nums">{formatMoney(row.amount, ctx.membership.currency)}</td>
                <td className="px-3 py-2 capitalize">{row.method.replaceAll("_"," ")}</td>
                <td className="px-3 py-2">{row.bankReference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
