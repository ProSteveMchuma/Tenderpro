"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      <Button type="button" onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  );
}
