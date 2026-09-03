import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { AlertBanner, PageHeader, Panel } from "@/components/shared/chrome";
import { DataTable } from "@/components/shared/data-table";
import { formatMoney } from "@/lib/money";
import { uploadQuotationAction, scoreQuotationsAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default async function QuotationsPage() {
  const ctx = await requirePermission("quotations.read");
  const rows = await query<{ id: string; supplier_name: string | null; total: string; score: string | null; delivery_period: string | null; warranty: string | null }>(
    `select id, supplier_name, total::text, score::text, delivery_period, warranty from quotations where organization_id=$1 order by score desc nulls last`,
    [ctx.membership.organizationId],
  );
  const recommended = rows[0];
  return (
    <div>
      <PageHeader title="Quotation comparison" description="Score suppliers on more than price. Humans always have the final say." />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <form action={uploadQuotationAction}>
            <h2 className="text-sm font-semibold">Upload quotation PDF</h2>
            <Field label="Supplier name" name="supplierName" />
            <input type="file" name="file" className="my-3 block text-sm" />
            <Button type="submit">Extract quotation</Button>
          </form>
        </Panel>
        <Panel className="p-4">
          <form action={scoreQuotationsAction}>
            <h2 className="text-sm font-semibold">Score quotations</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Uses price, delivery, warranty, payment terms, technical compliance and supplier rating.
            </p>
            <Button type="submit" className="mt-4">
              Recalculate scores
            </Button>
          </form>
        </Panel>
      </div>
      {recommended ? (
        <AlertBanner tone="success" title={`Recommended: ${recommended.supplier_name}`}>
          Score {recommended.score ?? "n/a"}. Override if another supplier is strategically better.
        </AlertBanner>
      ) : null}
      <div className="mt-4">
        <DataTable
          rows={rows}
          emptyTitle="No quotations yet"
          emptyDescription="Upload a quotation PDF or score existing responses."
          columns={[
            { key: "supplier", header: "Supplier", cell: (row) => row.supplier_name || "—" },
            {
              key: "total",
              header: "Total",
              align: "right",
              cell: (row) => <span className="tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</span>,
            },
            { key: "delivery", header: "Delivery", cell: (row) => row.delivery_period || "—" },
            { key: "warranty", header: "Warranty", cell: (row) => row.warranty || "—" },
            { key: "score", header: "Score", align: "right", cell: (row) => row.score ?? "—" },
          ]}
        />
      </div>
    </div>
  );
}
