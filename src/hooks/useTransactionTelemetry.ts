import { useCallback } from 'react';

type TelemetryEvent = 'tx_submitted' | 'tx_confirmed';

export function useTransactionTelemetry() {
  return useCallback((event: TelemetryEvent, metadata: Record<string, unknown>) => {
    // Scoped client-side telemetry hook for transaction milestones.
    // Replace with backend analytics transport when available.
    console.info('[telemetry]', event, metadata);
  }, []);
}
