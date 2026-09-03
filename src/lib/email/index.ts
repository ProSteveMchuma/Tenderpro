export interface EmailProvider {
  send(input: { to: string; subject: string; html: string; text?: string }): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(input: { to: string; subject: string; html: string; text?: string }) {
    console.info("[email:console]", { to: input.to, subject: input.subject, text: input.text });
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(input: { to: string; subject: string; html: string; text?: string }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Email provider error (${response.status})`);
    }
  }
}

export function getEmailProvider(): EmailProvider {
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) {
    return new ResendEmailProvider(
      process.env.RESEND_API_KEY,
      process.env.EMAIL_FROM || "SupplierOS Africa <noreply@example.com>",
    );
  }
  return new ConsoleEmailProvider();
}
