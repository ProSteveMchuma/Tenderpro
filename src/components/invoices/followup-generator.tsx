"use client";

import { useState, useTransition } from "react";
import { generateFollowupAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";

export function FollowupGenerator({ invoiceId }: { invoiceId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          const data = new FormData();
          data.set("invoiceId", invoiceId);
          start(async () => {
            const result = await generateFollowupAction(data);
            if (result.ok) {
              const payload = result.data as { message?: string };
              setMessage(payload.message || JSON.stringify(result.data));
            } else {
              setMessage(result.error);
            }
          });
        }}
      >
        Generate payment follow-up
      </Button>
      {message ? (
        <textarea className="mt-3 h-40 w-full rounded-lg border p-2 text-sm" readOnly value={message} />
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Messages are never sent automatically.</p>
      )}
    </div>
  );
}
