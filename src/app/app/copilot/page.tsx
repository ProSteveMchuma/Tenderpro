import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { CopilotForm } from "@/components/copilot/copilot-form";

export default async function CopilotPage() {
  await requirePermission("ai.use");
  return (
    <div className="max-w-2xl">
      <PageHeader title="AI Copilot" description="Answers are scoped to the current organization only." />
      <CopilotForm />
    </div>
  );
}
