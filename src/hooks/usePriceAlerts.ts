import { create } from 'zustand';
import { priceAlertStorage } from '@/lib/priceAlertStorage';
import type { PriceAlert, CreatePriceAlertPayload } from '@/types/priceAlert.types';
import type { PriceAlert as ServicePriceAlert } from '@/services/alert.service';

interface PriceAlertsState {
  alerts: PriceAlert[];
  addAlert: (payload: CreatePriceAlertPayload) => void;
  removeAlert: (id: string) => void;
  updateAlert: (id: string, patch: Partial<PriceAlert>) => void;
}

export const usePriceAlerts = create<PriceAlertsState>(() => ({
  alerts: priceAlertStorage.getAll(),

  addAlert(payload: CreatePriceAlertPayload): void {
    const newAlert = priceAlertStorage.add(payload);
    usePriceAlerts.setState(state => ({
      alerts: [...state.alerts, newAlert],
    }));
  },

  removeAlert(id: string): void {
    priceAlertStorage.remove(id);
    usePriceAlerts.setState(state => ({
      alerts: state.alerts.filter(a => a.id !== id),
    }));
  },

  updateAlert(id: string, patch: Partial<PriceAlert>): void {
    priceAlertStorage.update(id, patch);
    usePriceAlerts.setState(state => ({
      alerts: state.alerts.map(a => (a.id === id ? { ...a, ...patch } : a)),
    }));
  },
}));

// ---------------------------------------------------------------------------
// Named hooks expected by existing components in the dev branch.
// These adapt the localStorage-backed Zustand store to the React-Query-style
// interface those components depend on.
// ---------------------------------------------------------------------------

/** Returns all alerts for the current user from local storage. */
export function useActivePriceAlerts() {
  const alerts = usePriceAlerts(state => state.alerts);
  // Map to the ServicePriceAlert shape expected by existing dev components.
  const data: ServicePriceAlert[] = alerts.map(a => ({
    id: a.id,
    keyId: a.creatorId,
    keyName: a.creatorTitle,
    keyTitle: a.creatorTitle,
    targetPrice: a.thresholdStroops,
    direction: a.direction,
    triggered: a.lastTriggeredAt !== null,
    createdAt: a.createdAt,
  }));
  return { data, isLoading: false, isError: false };
}

interface CreateAlertVars {
  keyId: string;
  keyName: string;
  targetPrice: number;
  direction: 'above' | 'below';
}

/** Returns a mutation-compatible object for creating a new alert. */
export function useCreatePriceAlert() {
  const { addAlert } = usePriceAlerts.getState();
  return {
    mutate(vars: CreateAlertVars) {
      addAlert({
        creatorId: vars.keyId,
        creatorTitle: vars.keyName,
        thresholdStroops: vars.targetPrice,
        direction: vars.direction,
      });
    },
    mutateAsync(vars: CreateAlertVars) {
      addAlert({
        creatorId: vars.keyId,
        creatorTitle: vars.keyName,
        thresholdStroops: vars.targetPrice,
        direction: vars.direction,
      });
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    error: null,
    reset() {},
  };
}

interface UpdateAlertVars {
  id: string;
  targetPrice?: number;
  direction?: 'above' | 'below';
}

/** Returns a mutation-compatible object for updating an existing alert. */
export function useUpdatePriceAlert() {
  const { updateAlert } = usePriceAlerts.getState();
  return {
    mutate(vars: UpdateAlertVars) {
      const patch: Partial<PriceAlert> = {};
      if (vars.targetPrice !== undefined) patch.thresholdStroops = vars.targetPrice;
      if (vars.direction !== undefined) patch.direction = vars.direction;
      updateAlert(vars.id, patch);
    },
    mutateAsync(vars: UpdateAlertVars) {
      const patch: Partial<PriceAlert> = {};
      if (vars.targetPrice !== undefined) patch.thresholdStroops = vars.targetPrice;
      if (vars.direction !== undefined) patch.direction = vars.direction;
      updateAlert(vars.id, patch);
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    error: null,
    reset() {},
  };
}

/** Returns a mutation-compatible object for deleting an alert. */
export function useDeletePriceAlert() {
  const { removeAlert } = usePriceAlerts.getState();
  return {
    mutate(alertId: string) {
      removeAlert(alertId);
    },
    mutateAsync(alertId: string) {
      removeAlert(alertId);
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    error: null,
    reset() {},
  };
}
