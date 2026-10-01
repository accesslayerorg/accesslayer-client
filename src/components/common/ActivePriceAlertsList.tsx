import { useState } from 'react';
import { useActivePriceAlerts, useDeletePriceAlert, useUpdatePriceAlert } from '@/hooks/usePriceAlerts';
import PriceAlertModal from './PriceAlertModal';
import { Button } from '@/components/ui/button';
import type { PriceAlert } from '@/services/alert.service';

export interface ActivePriceAlertsListProps {
        userId: string | undefined;
        /** Optional resolver so the modal can show a current price when editing. */
        resolveCurrentPrice?: (keyId: string) => number | undefined;
}

export function ActivePriceAlertsList({ userId, resolveCurrentPrice }: ActivePriceAlertsListProps) {
        const { data: alerts, isLoading, isError } = useActivePriceAlerts(userId);
        const updateAlert = useUpdatePriceAlert(userId);
        const deleteAlert = useDeletePriceAlert(userId);
        const [editing, setEditing] = useState<PriceAlert | null>(null);
        const [submitError, setSubmitError] = useState<string | null>(null);

        const handleDelete = async (alertId: string) => {
                try {
                        await deleteAlert.mutateAsync(alertId);
                } catch (err) {
                        setSubmitError((err as Error).message ?? 'Could not delete alert.');
                }
        };

        const handleUpdate = async (input: { targetPrice: number; direction: 'above' | 'below' }) => {
                if (!editing) return;
                setSubmitError(null);
                try {
                        await updateAlert.mutateAsync({
                                alertId: editing.id,
                                targetPrice: input.targetPrice,
                                direction: input.direction,
                        });
                        setEditing(null);
                } catch (err) {
                        setSubmitError((err as Error).message ?? 'Could not update alert.');
                }
        };

        if (isLoading) {
                return (
                        <div data-testid="price-alerts-loading" className="text-sm text-white/60">
                                Loading alerts…
                        </div>
                );
        }

        if (isError) {
                return (
                        <div
                                data-testid="price-alerts-error"
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
                        >
                                Could not load your price alerts. Try refreshing.
                        </div>
                );
        }

        if (!alerts || alerts.length === 0) {
                return (
                        <div
                                data-testid="price-alerts-empty"
                                className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/60"
                        >
                                No active price alerts. Open any creator key page and choose "Set price alert"
                                to add one.
                        </div>
                );
        }

        const currentPrice = editing
                ? resolveCurrentPrice?.(editing.keyId) ?? editing.targetPrice
                : 0;

        return (
                <div data-testid="price-alerts-list" className="space-y-3">
                        {alerts.map(alert => (
                                <div
                                        key={alert.id}
                                        data-testid={`price-alert-row-${alert.id}`}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                                >
                                        <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">
                                                        {alert.keyTitle ?? alert.keyName ?? alert.keyId}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                        Notify when price goes{' '}
                                                        <strong>{alert.direction}</strong>{' '}
                                                        {alert.targetPrice} XLM
                                                </p>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                                <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        data-testid={`price-alert-edit-${alert.id}`}
                                                        onClick={() => {
                                                                setSubmitError(null);
                                                                setEditing(alert);
                                                        }}
                                                >
                                                        Edit
                                                </Button>
                                                <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        data-testid={`price-alert-delete-${alert.id}`}
                                                        onClick={() => handleDelete(alert.id)}
                                                >
                                                        Delete
                                                </Button>
                                        </div>
                                </div>
                        ))}

                        {editing && (
                                <PriceAlertModal
                                        open={Boolean(editing)}
                                        onOpenChange={(open: boolean) => {
                                                if (!open) setEditing(null);
                                        }}
                                        keyId={editing.keyId}
                                        keyName={editing.keyTitle ?? editing.keyName ?? editing.keyId}
                                        currentPrice={currentPrice}
                                        existingAlert={editing}
                                        onSubmit={handleUpdate}
                                        isSubmitting={updateAlert.isPending}
                                        submitError={submitError}
                                />
                        )}
                </div>
        );
}

export default ActivePriceAlertsList;
