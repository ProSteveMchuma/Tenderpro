import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { KpiCard, PageHeader, StatusBadge } from "@/components/shared/chrome";
import { DataTable } from "@/components/shared/data-table";
import { formatMoney } from "@/lib/money";
import { ageingBucket, daysOverdue } from "@/lib/dates";
import { addMoney } from "@/lib/money";
import { AlertTriangle, CircleDollarSign, FileText } from "lucide-react";

export default async function ReceivablesPage() {
  const ctx = await requirePermission("receivables.read");
  const rows = await query<{
    id: string;
    number: string;
    customer: string | null;
    po: string | null;
    issue_date: string;
    due_date: string;
    total: string;
    outstanding: string;
    status: string;
    last_follow_up_at: string | null;
    next_action: string | null;
  }>(
    `select i.id, i.number, c.name as customer, po.number as po, i.issue_date::text, i.due_date::text,
            i.total::text, i.outstanding::text, i.status, i.last_follow_up_at::text, i.next_action
     from invoices i
     left join customers c on c.id=i.customer_id
     left join purchase_orders po on po.id=i.purchase_order_id
     where i.organization_id=$1 and i.deleted_at is null and i.outstanding::numeric > 0
     order by i.due_date`,
    [ctx.membership.organizationId],
  );
  const now = new Date();
  let total = "0";
  let overdue = "0";
  for (const row of rows) {
    total = addMoney(total, row.outstanding);
    if (daysOverdue(row.due_date, now) > 0) overdue = addMoney(overdue, row.outstanding);
  }
  return (
    <div>
      <PageHeader title="Receivables" description="Cash still to collect. The operating metric that matters." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Total outstanding" value={formatMoney(total, ctx.membership.currency)} icon={CircleDollarSign} />
        <KpiCard
          label="Overdue"
          value={formatMoney(overdue, ctx.membership.currency)}
          icon={AlertTriangle}
          tone={Number(overdue) > 0 ? "danger" : "success"}
        />
        <KpiCard label="Open invoices" value={String(rows.length)} icon={FileText} />
      </div>
      <DataTable
        rows={rows}
        getHref={(row) => `/app/invoices/${row.id}`}
        emptyTitle="Nothing outstanding"
        emptyDescription="When invoices have a balance, they will appear here for collection."
        columns={[
          { key: "number", header: "Invoice", cell: (row) => <span className="font-medium">{row.number}</span> },
          { key: "customer", header: "Customer", cell: (row) => row.customer || "—" },
          { key: "po", header: "PO", hideOnMobile: true, cell: (row) => row.po || "—" },
          { key: "issue", header: "Issued", hideOnMobile: true, cell: (row) => row.issue_date },
          { key: "due", header: "Due", cell: (row) => row.due_date },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            hideOnMobile: true,
            cell: (row) => <span className="tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</span>,
          },
          {
            key: "outstanding",
            header: "Outstanding",
            align: "right",
            cell: (row) => <span className="tabular-nums">{formatMoney(row.outstanding, ctx.membership.currency)}</span>,
          },
          {
            key: "days",
            header: "Days",
            align: "right",
            cell: (row) => {
              const days = daysOverdue(row.due_date, now) || 0;
              return <span className={days > 0 ? "font-medium text-red-700 dark:text-red-300" : ""}>{days}</span>;
            },
          },
          { key: "age", header: "Age", cell: (row) => ageingBucket(daysOverdue(row.due_date, now) || 0) },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
          { key: "next", header: "Next action", hideOnMobile: true, cell: (row) => row.next_action || "—" },
        ]}
      />
    </div>
  );
}
