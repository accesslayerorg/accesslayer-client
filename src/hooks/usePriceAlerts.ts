import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
        alertService,
        type AlertDirection,
        type PriceAlert,
} from '@/services/alert.service';

export interface CreatePriceAlertInput {
        keyId: string;
        keyName?: string;
        targetPrice: number;
        direction: AlertDirection;
}

export interface UpdatePriceAlertInput {
        alertId: string;
        targetPrice: number;
        direction: AlertDirection;
}

/**
 * Fetch the current user's active price alerts. Polls every 60s so a
 * backend-triggered alert disappears from the list promptly.
 */
export function useActivePriceAlerts(userId: string | undefined) {
        return useQuery({
                queryKey: queryKeys.alerts.active(userId ?? ''),
                queryFn: () => alertService.getActiveAlerts(userId as string),
                enabled: Boolean(userId),
                refetchInterval: 60000,
        });
}

/** Create a price alert and refresh the active list. */
export function useCreatePriceAlert(userId: string | undefined) {
        const queryClient = useQueryClient();
        return useMutation({
                mutationFn: (input: CreatePriceAlertInput) => alertService.createAlert(input),
                onSuccess: () => {
                        void queryClient.invalidateQueries({
                                queryKey: queryKeys.alerts.active(userId ?? ''),
                        });
                },
        });
}

/** Update an existing alert's target price and/or direction. */
export function useUpdatePriceAlert(userId: string | undefined) {
        const queryClient = useQueryClient();
        return useMutation({
                mutationFn: ({ alertId, targetPrice, direction }: UpdatePriceAlertInput) =>
                        alertService.updateAlert(alertId, { targetPrice, direction }),
                onSuccess: () => {
                        void queryClient.invalidateQueries({
                                queryKey: queryKeys.alerts.active(userId ?? ''),
                        });
                },
        });
}

/** Delete an alert. Optimistically removes it from the active list. */
export function useDeletePriceAlert(userId: string | undefined) {
        const queryClient = useQueryClient();
        const queryKey = queryKeys.alerts.active(userId ?? '');
        return useMutation({
                mutationFn: (alertId: string) => alertService.deleteAlert(alertId),
                onMutate: async (alertId: string) => {
                        await queryClient.cancelQueries({ queryKey });
                        const previous = queryClient.getQueryData<PriceAlert[]>(queryKey);
                        if (previous) {
                                queryClient.setQueryData<PriceAlert[]>(
                                        queryKey,
                                        previous.filter(alert => alert.id !== alertId)
                                );
                        }
                        return { previous };
                },
                onError: (_err, _id, context) => {
                        if (context?.previous) {
                                queryClient.setQueryData(queryKey, context.previous);
                        }
                },
                onSettled: () => {
                        void queryClient.invalidateQueries({ queryKey });
                },
        });
}
