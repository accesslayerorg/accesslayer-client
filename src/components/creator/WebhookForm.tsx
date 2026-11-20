import React, { useState } from 'react';
import { createWebhook } from '../../services/webhooks';
import type { CreatedWebhook, WebhookEvent } from '../../services/webhooks';

export const WEBHOOK_EVENTS: WebhookEvent[] = ['key.bought', 'key.sold', 'holder.new'];

export function validateWebhookUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'URL is required';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'Enter a valid URL';
  }
  if (parsed.protocol !== 'https:') return 'Webhook URL must use HTTPS';
  return null;
}

interface WebhookFormProps {
  onCreated: (webhook: CreatedWebhook) => void;
}

export function WebhookForm({ onCreated }: WebhookFormProps) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleEvent = (event: WebhookEvent) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const urlError = validateWebhookUrl(url);
    setError(urlError);
    if (urlError) return;
    if (events.length === 0) {
      setSubmitError('Select at least one event');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createWebhook({ url: url.trim(), events });
      onCreated(created);
      setUrl('');
      setEvents([]);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Create webhook">
      <label>
        Endpoint URL
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'webhook-url-error' : undefined}
        />
      </label>
      {error && (
        <p id="webhook-url-error" role="alert">
          {error}
        </p>
      )}
      <fieldset>
        <legend>Events</legend>
        {WEBHOOK_EVENTS.map((event) => (
          <label key={event}>
            <input
              type="checkbox"
              checked={events.includes(event)}
              onChange={() => toggleEvent(event)}
            />
            {event}
          </label>
        ))}
      </fieldset>
      {submitError && <p role="alert">{submitError}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create webhook'}
      </button>
    </form>
  );
}

export default WebhookForm;
