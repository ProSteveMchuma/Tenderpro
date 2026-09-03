export interface WhatsAppAdapter {
  send(input: { to: string; message: string }): Promise<{ id: string }>;
}

class MockWhatsApp implements WhatsAppAdapter {
  async send(input: { to: string; message: string }) {
    console.info("[whatsapp:mock]", input);
    return { id: `mock-${Date.now()}` };
  }
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  return new MockWhatsApp();
}
