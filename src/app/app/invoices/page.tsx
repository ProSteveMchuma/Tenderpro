import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";
import { formatMoney } from "@/lib/money";
import { daysOverdue } from "@/lib/dates";

export default async function InvoicesPage() {
  const ctx = await requirePermission("invoices.read");
  const rows = await query<{ id: string; number: string; status: string; total: string; outstanding: string; due_date: string; customer: string | null }>(
    `select i.id, i.number, i.status, i.total::text, i.outstanding::text, i.due_date::text, c.name as customer
     from invoices i left join customers c on c.id=i.customer_id
     where i.organization_id=$1 and i.deleted_at is null order by i.due_date`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Issue, track and collect. Overdue invoices are highlighted first in receivables."
        action={<ButtonLink href="/app/invoices/new">Create invoice</ButtonLink>}
      />
      <DataTable
        rows={rows}
        getHref={(row) => `/app/invoices/${row.id}`}
        emptyTitle="No invoices yet"
        emptyDescription="Create an invoice after a PO is ready — or from a signed GRN."
        emptyHref="/app/invoices/new"
        emptyAction="Create invoice"
        columns={[
          { key: "number", header: "Invoice", cell: (row) => <span className="font-medium">{row.number}</span> },
          { key: "customer", header: "Customer", cell: (row) => row.customer || "—" },
          {
            key: "due",
            header: "Due",
            cell: (row) => {
              const days = daysOverdue(row.due_date);
              return (
                <span>
                  {row.due_date}
                  {days > 0 ? <span className="ml-1 text-red-700 dark:text-red-300">· {days}d overdue</span> : null}
                </span>
              );
            },
          },
          {
            key: "outstanding",
            header: "Outstanding",
            align: "right",
            cell: (row) => <span className="tabular-nums">{formatMoney(row.outstanding, ctx.membership.currency)}</span>,
          },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
        ]}
      />
    </div>
  );
}
