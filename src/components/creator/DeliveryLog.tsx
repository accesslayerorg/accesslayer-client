import { useEffect, useState } from 'react';

export interface WebhookDelivery {
  id: string;
  event: string;
  statusCode: number | null;
  timestamp: string;
}

function isSuccessStatus(statusCode: number | null): boolean {
  return statusCode !== null && statusCode >= 200 && statusCode < 300;
}

async function listDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
  const res = await fetch(`/api/webhooks/${encodeURIComponent(webhookId)}/deliveries`);
  if (!res.ok) throw new Error(`Failed to load deliveries (${res.status})`);
  return (await res.json()) as WebhookDelivery[];
}

async function redeliver(webhookId: string, deliveryId: string): Promise<WebhookDelivery> {
  const res = await fetch(
    `/api/webhooks/${encodeURIComponent(webhookId)}/deliveries/${encodeURIComponent(deliveryId)}/redeliver`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Redelivery failed (${res.status})`);
  return (await res.json()) as WebhookDelivery;
}

interface DeliveryLogProps {
  webhookId: string;
}

export function DeliveryLog({ webhookId }: DeliveryLogProps) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeliveringId, setRedeliveringId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDeliveries(webhookId)
      .then((rows: WebhookDelivery[]) => {
        if (!cancelled) setDeliveries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load deliveries');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [webhookId]);

  const handleRedeliver = async (deliveryId: string) => {
    setRedeliveringId(deliveryId);
    setError(null);
    try {
      const created = await redeliver(webhookId, deliveryId);
      setDeliveries((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redelivery failed');
    } finally {
      setRedeliveringId(null);
    }
  };

  if (loading) return <p>Loading deliveries…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (deliveries.length === 0) return <p>No deliveries yet.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Event</th>
          <th>Status</th>
          <th>Timestamp</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {deliveries.map((d) => {
          const ok = isSuccessStatus(d.statusCode);
          return (
            <tr
              key={d.id}
              data-testid="delivery-row"
              data-failed={ok ? 'false' : 'true'}
              className={ok ? undefined : 'delivery-failed'}
              style={ok ? undefined : { backgroundColor: '#fde8e8' }}
            >
              <td>{d.event}</td>
              <td>{d.statusCode ?? 'No response'}</td>
              <td>{new Date(d.timestamp).toLocaleString()}</td>
              <td>
                <button
                  type="button"
                  onClick={() => handleRedeliver(d.id)}
                  disabled={redeliveringId === d.id}
                >
                  Redeliver
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default DeliveryLog;
