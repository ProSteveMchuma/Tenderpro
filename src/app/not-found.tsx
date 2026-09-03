import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">This page is not in the workspace</h1>
      <Link href="/app" className="mt-4 underline">
        Back to overview
      </Link>
    </div>
  );
}
