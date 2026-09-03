import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/chrome";

export type DataColumn<T> = {
  key: string;
  header: string;
  className?: string;
  align?: "left" | "right";
  hideOnMobile?: boolean;
  cell: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  getHref,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Records will appear here once they are created.",
  emptyHref,
  emptyAction,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  getHref?: (row: T) => string | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyHref?: string;
  emptyAction?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        href={emptyHref}
        actionLabel={emptyAction}
      />
    );
  }

  const primary = columns[0];

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 transition-colors hover:bg-muted/35">
                {columns.map((column, index) => {
                  const href = index === 0 ? getHref?.(row) : undefined;
                  const content = column.cell(row);
                  return (
                    <td
                      key={column.key}
                      className={cn("px-4 py-3 align-middle", column.align === "right" && "text-right", column.className)}
                    >
                      {href ? (
                        <Link href={href} className="font-medium text-foreground hover:text-primary hover:underline">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => {
          const href = getHref?.(row);
          const card = (
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
              <div className="min-w-0 font-medium">{primary.cell(row)}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {columns.slice(1).map((column) =>
                  column.hideOnMobile ? null : (
                    <div key={column.key}>
                      <dt className="text-muted-foreground">{column.header}</dt>
                      <dd className="mt-0.5">{column.cell(row)}</dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          );
          return href ? (
            <Link key={row.id} href={href} className="block">
              {card}
            </Link>
          ) : (
            <div key={row.id}>{card}</div>
          );
        })}
      </div>
    </>
  );
}
