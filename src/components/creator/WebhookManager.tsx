import React, { useEffect, useState } from 'react';
import { WebhookForm } from './WebhookForm';
import { DeliveryLog } from './DeliveryLog';
import { deleteWebhook, listWebhooks } from '../../services/webhooks';
import type { CreatedWebhook, Webhook } from '../../services/webhooks';

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<CreatedWebhook | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWebhooks()
      .then((rows) => {
        if (!cancelled) setWebhooks(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load webhooks');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreated = (created: CreatedWebhook) => {
    const { secret, ...webhook } = created;
    setWebhooks((prev) => [...prev, webhook]);
    setRevealed(created);
    setCopied(false);
    setSelectedId(webhook.id);
  };

  const dismissSecret = () => {
    setRevealed(null);
    setCopied(false);
  };

  const copySecret = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.secret);
      setCopied(true);
    } catch {
      setError('Could not copy secret to clipboard');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this webhook endpoint? This cannot be undone.');
    if (!confirmed) return;
    setError(null);
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      if (selectedId === id) setSelectedId(null);
      if (revealed?.id === id) dismissSecret();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  return (
    <section aria-label="Webhook management">
      <h2>Webhooks</h2>

      <WebhookForm onCreated={handleCreated} />

      {revealed && (
        <div role="status">
          <p>
            Signing secret for <code>{revealed.url}</code>. It will not be shown again.
          </p>
          <code data-testid="webhook-secret">{revealed.secret}</code>
          <button type="button" onClick={copySecret}>
            {copied ? 'Copied' : 'Copy secret'}
          </button>
          <button type="button" onClick={dismissSecret}>
            Done
          </button>
        </div>
      )}

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading webhooks…</p>
      ) : webhooks.length === 0 ? (
        <p>No webhook endpoints configured.</p>
      ) : (
        <ul>
          {webhooks.map((w) => (
            <li key={w.id}>
              <span>{w.url}</span> <span>({w.events.join(', ')})</span>{' '}
              <button type="button" onClick={() => setSelectedId(w.id)}>
                View deliveries
              </button>{' '}
              <button type="button" onClick={() => handleDelete(w.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId && <DeliveryLog key={selectedId} webhookId={selectedId} />}
    </section>
  );
}

export default WebhookManager;
