"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Command } from "cmdk";
import Link from "next/link";
import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { switchOrganizationAction } from "@/app/actions/auth";
import { globalSearchAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";

const COMMANDS = [
  { href: "/app/invoices/new", label: "Create invoice" },
  { href: "/app/tenders/new", label: "Upload tender" },
  { href: "/app/purchase-orders/new", label: "Create PO" },
  { href: "/app/customers/new", label: "Add customer" },
  { href: "/app/suppliers/new", label: "Add supplier" },
  { href: "/app/vault/new", label: "Upload document" },
  { href: "/app/rfqs/new", label: "Create RFQ" },
];

export function Topbar({
  userName,
  memberships,
  currentOrgId,
}: {
  userName: string;
  memberships: { organizationId: string; organizationName: string }[];
  currentOrgId: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; type: string }[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    const handle = setTimeout(() => {
      start(async () => {
        const rows = await globalSearchAction(query);
        setResults(rows as { id: string; title: string; type: string }[]);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const hrefFor = useMemo(
    () => (item: { id: string; type: string }) => {
      const map: Record<string, string> = {
        customer: `/app/customers/${item.id}`,
        tender: `/app/tenders/${item.id}`,
        invoice: `/app/invoices/${item.id}`,
        purchase_order: `/app/purchase-orders/${item.id}`,
        supplier: `/app/suppliers/${item.id}`,
      };
      return map[item.type] || "/app";
    },
    [],
  );

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-left text-sm text-muted-foreground md:max-w-xl"
      >
        <Search className="size-4" />
        <span className="truncate">Search tenders, invoices, customers…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 text-[10px] md:inline">⌘K</kbd>
      </button>
      <form action={switchOrganizationAction}>
        <select
          name="organizationId"
          defaultValue={currentOrgId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-9 max-w-[180px] rounded-lg border bg-background px-2 text-sm"
          aria-label="Switch organization"
        >
          {memberships.map((item) => (
            <option key={item.organizationId} value={item.organizationId}>
              {item.organizationName}
            </option>
          ))}
        </select>
      </form>
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>
      <div className="hidden text-sm md:block">{userName}</div>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-[12vh] max-w-xl overflow-hidden rounded-xl border bg-background shadow-xl" onClick={(event) => event.stopPropagation()}>
            <Command className="block">
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search or run a command"
                className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-2 py-6 text-sm text-muted-foreground">{pending ? "Searching…" : "No results"}</Command.Empty>
                <Command.Group heading="Actions" className="px-1 py-2 text-xs text-muted-foreground">
                  {COMMANDS.map((item) => (
                    <Command.Item
                      key={item.href}
                      onSelect={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                      className="flex cursor-pointer rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                {results.length && query.trim() ? (
                  <Command.Group heading="Records" className="px-1 py-2 text-xs text-muted-foreground">
                    {results.map((item) => (
                      <Command.Item
                        key={`${item.type}-${item.id}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(hrefFor(item));
                        }}
                        className="flex cursor-pointer justify-between rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        <span>{item.title}</span>
                        <span className="text-xs capitalize text-muted-foreground">{item.type.replaceAll("_", " ")}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
              </Command.List>
            </Command>
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              <Link href="/app/copilot" onClick={() => setOpen(false)}>
                Ask Copilot
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
