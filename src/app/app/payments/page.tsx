import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { DataTable } from "@/components/shared/data-table";
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
      <DataTable
        rows={rows}
        emptyTitle="No payments recorded"
        emptyDescription="Allocate a payment from an invoice to start the collection trail."
        columns={[
          { key: "date", header: "Date", cell: (row) => row.payment_date },
          { key: "customer", header: "Customer", cell: (row) => row.customer || "—" },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            cell: (row) => <span className="tabular-nums">{formatMoney(row.amount, ctx.membership.currency)}</span>,
          },
          { key: "method", header: "Method", cell: (row) => <span className="capitalize">{row.method.replaceAll("_", " ")}</span> },
          { key: "ref", header: "Reference", hideOnMobile: true, cell: (row) => row.bank_reference || "—" },
        ]}
      />
    </div>
  );
}
