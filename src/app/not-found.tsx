import { ButtonLink } from "@/components/shared/button-link";
import { BrandLockup } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <BrandLockup href="/" />
      <p className="mt-8 text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page is not in the workspace</h1>
      <ButtonLink href="/app" className="mt-4">
        Back to overview
      </ButtonLink>
    </div>
  );
}
