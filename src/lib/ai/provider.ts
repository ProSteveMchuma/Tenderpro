export type AiMessage = { role: "system" | "user"; content: string };

export type AiStructuredRequest = {
  capability: string;
  messages: AiMessage[];
  schemaName: string;
  temperature?: number;
};

export interface AiProvider {
  name: string;
  completeJson(request: AiStructuredRequest): Promise<unknown>;
}
