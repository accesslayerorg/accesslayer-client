import React, { useEffect, useState } from 'react';
import { listDeliveries, redeliver } from '../../services/webhooks';
import type { WebhookDelivery } from '../../services/webhooks';

interface DeliveryLogProps {
  webhookId: string;
}

export function isSuccessStatus(statusCode: number | null): boolean {
  return statusCode !== null && statusCode >= 200 && statusCode < 300;
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
      .then((rows) => {
        if (!cancelled) setDeliveries(rows);
      })
      .catch((err) => {
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
            <tr key={d.id} data-testid="delivery-row" data-failed={ok ? 'false' : 'true'} className={ok ? undefined : 'delivery-failed'} style={ok ? undefined : { backgroundColor: '#fde8e8' }}>
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
