"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Command } from "cmdk";
import Link from "next/link";
import { ChevronDown, LogOut, Moon, Search, Settings, Sparkles, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { logoutAction, switchOrganizationAction } from "@/app/actions/auth";
import { globalSearchAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileMenuButton } from "@/components/app-shell/mobile-nav";

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
  organizationName,
}: {
  userName: string;
  memberships: { organizationId: string; organizationName: string }[];
  currentOrgId: string;
  organizationName: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; type: string }[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur-sm lg:px-5">
      <MobileMenuButton organizationName={organizationName} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 md:max-w-xl"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search tenders, invoices, customers…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </button>
      <form action={switchOrganizationAction} className="max-w-[140px] sm:max-w-[200px]">
        <label className="sr-only" htmlFor="organizationId">
          Switch organization
        </label>
        <select
          id="organizationId"
          name="organizationId"
          defaultValue={currentOrgId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-9 max-w-[200px] rounded-lg border bg-background px-2 text-sm"
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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2" />
          }
        >
          <Avatar size="sm">
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate text-sm md:inline">{userName}</span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground md:inline" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <div className="px-1.5 py-1.5 text-xs font-medium text-muted-foreground">{userName}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/app/settings")}>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/app/copilot")}>
            <Sparkles />
            Copilot
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/app/team")}>
            <UserRound />
            Team
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              const form = document.getElementById("sos-logout") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form id="sos-logout" action={logoutAction} className="hidden" />
      {open ? (
        <div className="fixed inset-0 z-50 bg-foreground/30 p-4 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div
            className="mx-auto mt-[12vh] max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Command className="block">
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search or run a command"
                className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-2 py-6 text-sm text-muted-foreground">
                  {pending ? "Searching…" : "No results"}
                </Command.Empty>
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
              <Link href="/app/copilot" onClick={() => setOpen(false)} className="hover:text-foreground">
                Ask Copilot
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
