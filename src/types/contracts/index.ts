export type WebhookEvent = "key.bought" | "key.sold" | "holder.new";

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEvent[];
  createdAt: string;
}

export interface WebhookCreateRequest {
  url: string;
  events: WebhookEvent[];
}

export interface WebhookCreateResponse extends WebhookEndpoint {
  signingSecret: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  statusCode: number | null;
  timestamp: string;
}

export const WEBHOOK_EVENTS: readonly WebhookEvent[] = [
  "key.bought",
  "key.sold",
  "holder.new",
] as const;
