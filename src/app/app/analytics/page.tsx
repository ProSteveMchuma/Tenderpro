import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { addMoney, formatMoney } from "@/lib/money";

export default async function AnalyticsPage() {
  const ctx = await requirePermission("analytics.read");
  const orgId = ctx.membership.organizationId;
  const customers = await listByOrg("customers", orgId);
  const invoices = await listByOrg("invoices", orgId);
  const byCustomer = customers
    .map((customer) => {
      const related = invoices.filter((invoice) => asString(invoice.customerId) === asString(customer.id));
      return {
        name: asString(customer.name),
        total: related.reduce((sum, invoice) => addMoney(sum, moneyString(invoice.total)), "0"),
      };
    })
    .sort((a, b) => Number(b.total) - Number(a.total));
  const tenders = await listByOrg("tenders", orgId);
  const tenderStats = {
    active: tenders.filter((row) => !["lost", "cancelled"].includes(asString(row.status))).length,
    awarded: tenders.filter((row) => asString(row.status) === "awarded").length,
    lost: tenders.filter((row) => asString(row.status) === "lost").length,
  };
  return (
    <div>
      <PageHeader title="Analytics" description="Tenant-private performance. Cross-organization payment intelligence is modelled but not exposed." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-background p-4">
          <h2 className="font-medium">Sales by customer</h2>
          <div className="mt-3 space-y-2 text-sm">
            {byCustomer.map((row) => (
              <div key={row.name} className="flex justify-between"><span>{row.name}</span><span className="tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</span></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <h2 className="font-medium">Tender outcomes</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Submitted / active</span><span>{tenderStats.active}</span></div>
            <div className="flex justify-between"><span>Awards</span><span>{tenderStats.awarded}</span></div>
            <div className="flex justify-between"><span>Losses</span><span>{tenderStats.lost}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
