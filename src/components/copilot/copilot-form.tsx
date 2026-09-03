"use client";

import { useState, useTransition } from "react";
import { copilotAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";

export function CopilotForm() {
  const [answer, setAnswer] = useState<string>("");
  const [pending, start] = useTransition();
  return (
    <form
      className="rounded-xl border bg-background p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const question = String(new FormData(event.currentTarget).get("question") || "");
        start(async () => {
          const result = await copilotAction(question);
          setAnswer(result.answer);
        });
      }}
    >
      <textarea name="question" required placeholder="Which invoices are overdue?" className="h-28 w-full rounded-lg border p-3 text-sm" />
      <Button type="submit" className="mt-3" disabled={pending}>Ask</Button>
      {answer ? <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{answer}</pre> : null}
    </form>
  );
}
