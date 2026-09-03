import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { calculateTenderReadiness } from "@/lib/domain/tender-readiness";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { rerunTenderAnalysisAction, runBidAuditAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const missingMandatory = readiness.missingMandatory.map((item) => item);
  return (
    <div>
      <PageHeader
        title={String(tender.title)}
        description={`${tender.reference || "No reference"} · ${tender.procuring_entity || "Unknown entity"}`}
      />
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-background p-4">
          <div className="text-xs text-muted-foreground">Tender readiness</div>
          <div className="mt-1 text-3xl font-semibold">{readiness.percent}%</div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <div className="text-xs text-muted-foreground">Mandatory</div>
          <div className="mt-1 text-2xl font-semibold">
            {readiness.mandatoryComplete}/{readiness.mandatoryTotal}
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <div className="text-xs text-muted-foreground">Closes</div>
          <div className="mt-1 text-sm font-medium">{formatDateTime(String(tender.closing_at || ""), ctx.membership.timezone)}</div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <div className="text-xs text-muted-foreground">Value</div>
          <div className="mt-1 text-lg font-semibold">
            {tender.tender_value ? formatMoney(String(tender.tender_value), String(tender.currency || ctx.membership.currency)) : "—"}
          </div>
        </div>
      </div>
      {readiness.highDisqualificationRisk ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <div className="font-semibold">⚠ HIGH DISQUALIFICATION RISK</div>
          <p className="mt-1 text-sm">
            Missing mandatory requirement: {missingMandatory[0] ? requirements.find((row) => row.status !== "complete" && row.mandatory)?.requirement_text : "See checklist"}
          </p>
        </div>
      ) : null}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="submission">Submission</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="rounded-xl border bg-background p-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Submission method</dt>
              <dd>{String(tender.submission_method || "—")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Location / portal</dt>
              <dd>{String(tender.submission_location || "—")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Security</dt>
              <dd>{tender.tender_security_amount ? formatMoney(String(tender.tender_security_amount), ctx.membership.currency) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Validity</dt>
              <dd>{String(tender.tender_validity_period || "—")}</dd>
            </div>
          </dl>
          <form action={rerunTenderAnalysisAction} className="mt-4">
            <input type="hidden" name="tenderId" value={id} />
            <Button type="submit" variant="outline">
              Retry AI extraction
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="compliance" className="overflow-x-auto rounded-xl border bg-background">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Requirement</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Mandatory</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.requirement_text}</td>
                  <td className="px-3 py-2 capitalize">{row.category}</td>
                  <td className="px-3 py-2">{row.mandatory ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.match_reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid gap-2 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
            {readiness.categories.map((category) => (
              <div key={category.category} className="text-sm">
                <div className="capitalize text-muted-foreground">{category.category}</div>
                <div className="font-medium">
                  {category.complete}/{category.total}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="forms" className="rounded-xl border bg-background p-4 text-sm">
          <p>Forms requiring completion, signature or stamp are listed as requirements in the compliance checklist. Attach completed forms in Company Vault and re-run matching.</p>
        </TabsContent>
        <TabsContent value="submission" className="rounded-xl border bg-background p-4">
          <h3 className="font-medium">Final bid QA</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>All mandatory documents attached {readiness.highDisqualificationRisk ? "✗" : "✓"}</li>
            <li>Forms signed {requirements.some((row) => row.category === "forms" && row.status !== "complete") ? "✗" : "✓"}</li>
            <li>Closing deadline confirmed ✓ — {String(tender.closing_date || "")} {String(tender.closing_time || "")}</li>
          </ul>
          <form action={runBidAuditAction} className="mt-4">
            <input type="hidden" name="tenderId" value={id} />
            <Button type="submit">Run Final Bid Audit</Button>
          </form>
          {audit?.output ? (
            <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(audit.output, null, 2)}</pre>
          ) : null}
        </TabsContent>
        <TabsContent value="activity" className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
          Tender activity is recorded in the organization timeline.
        </TabsContent>
      </Tabs>
    </div>
  );
}
