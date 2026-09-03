import { ButtonLink } from "@/components/shared/button-link";
import { BrandLockup } from "@/components/brand/logo";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <BrandLockup href="/app" />
      <p className="mt-8 text-sm text-muted-foreground">403</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">You do not have access</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">This action is limited by your role in the current organization.</p>
      <ButtonLink href="/app" className="mt-4">
        Back to overview
      </ButtonLink>
    </div>
  );
}
