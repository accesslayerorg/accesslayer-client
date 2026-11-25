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
  secret: string;
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

export function validateWebhookUrl(url: string | null | undefined): string | null {
  if (url == null || url.trim() === "") {
    return "URL is required";
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return "Webhook URL must use HTTPS";
    }
    if (parsed.hostname === "" || parsed.pathname === "") {
      return "Enter a valid URL";
    }
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

// The PR includes components/unit tests that import these helpers from the
// webhook service module. The real backend integration will be wired in a
// later change; for now these are stubs so the build keeps type-checking.
export function listWebhooks(): Promise<WebhookEndpoint[]> {
  return Promise.reject(new Error("listWebhooks not implemented"));
}

export function createWebhook(_input: WebhookCreateRequest): Promise<WebhookCreateResponse> {
  void _input;
  return Promise.reject(new Error("createWebhook not implemented"));
}

export function deleteWebhook(_id: string): Promise<void> {
  void _id;
  return Promise.reject(new Error("deleteWebhook not implemented"));
}

export function listDeliveries(_webhookId: string): Promise<WebhookDelivery[]> {
  void _webhookId;
  return Promise.reject(new Error("listDeliveries not implemented"));
}

export function redeliver(_webhookId: string, _deliveryId: string): Promise<WebhookDelivery> {
  void _webhookId;
  void _deliveryId;
  return Promise.reject(new Error("redeliver not implemented"));
}
