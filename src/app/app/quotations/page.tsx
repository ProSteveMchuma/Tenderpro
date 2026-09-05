import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { uploadQuotationAction, scoreQuotationsAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default async function QuotationsPage() {
  const ctx = await requirePermission("quotations.read");
  const rows = (await listByOrg("quotations", ctx.membership.organizationId))
    .map((row) => ({
      id: asString(row.id),
      supplierName: row.supplierName ? asString(row.supplierName) : null,
      total: moneyString(row.total),
      score: row.score == null ? null : asString(row.score),
      deliveryPeriod: row.deliveryPeriod ? asString(row.deliveryPeriod) : null,
      warranty: row.warranty ? asString(row.warranty) : null,
    }))
    .sort((a, b) => {
      if (a.score == null && b.score == null) return 0;
      if (a.score == null) return 1;
      if (b.score == null) return -1;
      return Number(b.score) - Number(a.score);
    });
  const recommended = rows[0];
  return (
    <div>
      <PageHeader title="Quotation comparison" description="Score suppliers on more than price. Humans always have the final say." />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <form action={uploadQuotationAction} className="rounded-xl border bg-background p-4">
          <h2 className="font-medium">Upload quotation PDF</h2>
          <Field label="Supplier name" name="supplierName" />
          <input type="file" name="file" className="my-3 block text-sm" />
          <Button type="submit">Extract quotation</Button>
        </form>
        <form action={scoreQuotationsAction} className="rounded-xl border bg-background p-4">
          <h2 className="font-medium">Score quotations</h2>
          <p className="mt-2 text-sm text-muted-foreground">Uses price, delivery, warranty, payment terms, technical compliance and supplier rating.</p>
          <Button type="submit" className="mt-4">Recalculate scores</Button>
        </form>
      </div>
      {recommended ? (
        <div className="mb-4 rounded-xl border bg-emerald-50 p-4 text-sm text-emerald-950">
          Recommended supplier: <strong>{recommended.supplierName}</strong> with score {recommended.score ?? "n/a"}. Override if another supplier is strategically better.
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Supplier</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Delivery</th><th className="px-3 py-2">Warranty</th><th className="px-3 py-2">Score</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.supplierName}</td>
                <td className="px-3 py-2 tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</td>
                <td className="px-3 py-2">{row.deliveryPeriod}</td>
                <td className="px-3 py-2">{row.warranty}</td>
                <td className="px-3 py-2">{row.score ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
