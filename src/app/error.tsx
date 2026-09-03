"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
        Try again
      </button>
    </div>
  );
}
