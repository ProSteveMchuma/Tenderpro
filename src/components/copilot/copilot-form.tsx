"use client";

import { useState, useTransition } from "react";
import { copilotAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/chrome";

export function CopilotForm() {
  const [answer, setAnswer] = useState<string>("");
  const [pending, start] = useTransition();
  return (
    <Panel className="p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const question = String(new FormData(event.currentTarget).get("question") || "");
          start(async () => {
            const result = await copilotAction(question);
            setAnswer(result.answer);
          });
        }}
      >
        <textarea
          name="question"
          required
          placeholder="Which invoices are overdue?"
          className="h-28 w-full rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" className="mt-3" disabled={pending}>
          {pending ? "Thinking…" : "Ask"}
        </Button>
        {answer ? <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{answer}</pre> : null}
      </form>
    </Panel>
  );
}
