import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { calculateTenderReadiness } from "@/lib/domain/tender-readiness";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { AlertBanner, KpiCard, Meter, PageHeader, Panel, StatusBadge } from "@/components/shared/chrome";
import { rerunTenderAnalysisAction, runBidAuditAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, CircleDollarSign, FileCheck, ShieldAlert } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";

export default async function TenderWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("tenders.read");
  const tender = await queryOne<Record<string, unknown>>(
    `select * from tenders where id=$1 and organization_id=$2 and deleted_at is null`,
    [id, ctx.membership.organizationId],
  );
  if (!tender) notFound();
  const requirements = await query<{
    id: string;
    requirement_text: string;
    category: string;
    mandatory: boolean;
    status: string;
    match_reason: string | null;
    confidence: string;
    page_number: number | null;
  }>(
    `select id, requirement_text, category, mandatory, status, match_reason, confidence, page_number
     from tender_requirements where tender_id=$1 and organization_id=$2 order by mandatory desc, category`,
    [id, ctx.membership.organizationId],
  );
  const readiness = calculateTenderReadiness(requirements);
  const audit = await queryOne<{ output: unknown }>(
    `select output from ai_jobs where organization_id=$1 and entity_id=$2 and capability='runBidAudit' order by created_at desc limit 1`,
    [ctx.membership.organizationId, id],
  );
  const missingMandatory = requirements.find((row) => row.status !== "complete" && row.mandatory);
  return (
    <div>
      <PageHeader
        eyebrow="Tender workspace"
        title={String(tender.title)}
        description={`${tender.reference || "No reference"} · ${tender.procuring_entity || "Unknown entity"}`}
        action={<StatusBadge value={String(tender.status)} />}
      />
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <KpiCard
          label="Tender readiness"
          value={`${readiness.percent}%`}
          hint={`${readiness.mandatoryComplete}/${readiness.mandatoryTotal} mandatory complete`}
          icon={FileCheck}
          tone={readiness.percent < 50 ? "danger" : readiness.percent < 80 ? "warning" : "success"}
        />
        <KpiCard
          label="Mandatory"
          value={`${readiness.mandatoryComplete}/${readiness.mandatoryTotal}`}
          icon={ShieldAlert}
          tone={readiness.highDisqualificationRisk ? "danger" : "default"}
        />
        <KpiCard
          label="Closes"
          value={formatDateTime(String(tender.closing_at || ""), ctx.membership.timezone)}
          icon={CalendarClock}
        />
        <KpiCard
          label="Value"
          value={tender.tender_value ? formatMoney(String(tender.tender_value), String(tender.currency || ctx.membership.currency)) : "—"}
          icon={CircleDollarSign}
        />
      </div>
      {readiness.highDisqualificationRisk ? (
        <div className="mb-6">
          <AlertBanner tone="danger" title="High disqualification risk">
            Missing mandatory requirement: {missingMandatory?.requirement_text || "See the compliance checklist."}
          </AlertBanner>
        </div>
      ) : null}
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-4 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="submission">Submission</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Panel className="p-5">
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Submission method</dt>
                <dd className="mt-1">{String(tender.submission_method || "—")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Location / portal</dt>
                <dd className="mt-1">{String(tender.submission_location || "—")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Security</dt>
                <dd className="mt-1">
                  {tender.tender_security_amount ? formatMoney(String(tender.tender_security_amount), ctx.membership.currency) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Validity</dt>
                <dd className="mt-1">{String(tender.tender_validity_period || "—")}</dd>
              </div>
            </dl>
            <form action={rerunTenderAnalysisAction} className="mt-5">
              <input type="hidden" name="tenderId" value={id} />
              <Button type="submit" variant="outline">
                Retry AI extraction
              </Button>
            </form>
          </Panel>
        </TabsContent>
        <TabsContent value="compliance" className="space-y-4">
          <DataTable
            rows={requirements}
            emptyTitle="No requirements extracted"
            emptyDescription="Retry AI extraction or add requirements after reviewing the tender document."
            columns={[
              { key: "req", header: "Requirement", cell: (row) => row.requirement_text },
              { key: "cat", header: "Category", cell: (row) => <span className="capitalize">{row.category}</span> },
              { key: "mand", header: "Mandatory", cell: (row) => (row.mandatory ? "Yes" : "No") },
              { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
              { key: "evidence", header: "Evidence", hideOnMobile: true, cell: (row) => <span className="text-muted-foreground">{row.match_reason || "—"}</span> },
            ]}
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {readiness.categories.map((category) => (
              <Panel key={category.category} className="p-3">
                <div className="capitalize text-xs text-muted-foreground">{category.category}</div>
                <div className="mt-1 font-medium">
                  {category.complete}/{category.total}
                </div>
                <Meter value={category.total ? Math.round((category.complete / category.total) * 100) : 0} className="mt-2" />
              </Panel>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="forms">
          <Panel className="p-5 text-sm leading-6 text-muted-foreground">
            Forms requiring completion, signature or stamp are listed as requirements in the compliance checklist. Attach completed forms in Company Vault and re-run matching.
          </Panel>
        </TabsContent>
        <TabsContent value="submission">
          <Panel className="p-5">
            <h3 className="text-sm font-semibold">Final bid QA</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>All mandatory documents attached {readiness.highDisqualificationRisk ? "✗" : "✓"}</li>
              <li>Forms signed {requirements.some((row) => row.category === "forms" && row.status !== "complete") ? "✗" : "✓"}</li>
              <li>
                Closing deadline confirmed ✓ — {String(tender.closing_date || "")} {String(tender.closing_time || "")}
              </li>
            </ul>
            <form action={runBidAuditAction} className="mt-4">
              <input type="hidden" name="tenderId" value={id} />
              <Button type="submit">Run final bid audit</Button>
            </form>
            {audit?.output ? (
              <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(audit.output, null, 2)}</pre>
            ) : null}
          </Panel>
        </TabsContent>
        <TabsContent value="activity">
          <Panel className="p-5 text-sm text-muted-foreground">Tender activity is recorded in the organization timeline.</Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
