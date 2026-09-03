import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">403</p>
      <h1 className="mt-2 text-2xl font-semibold">You do not have access</h1>
      <p className="mt-2 text-sm text-muted-foreground">This action is limited by your role in the current organization.</p>
      <Link href="/app" className="mt-4 underline">Back to overview</Link>
    </div>
  );
}
