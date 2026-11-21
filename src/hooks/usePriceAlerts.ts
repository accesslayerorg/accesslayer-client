import { create } from 'zustand';
import { priceAlertStorage } from '@/lib/priceAlertStorage';
import type { PriceAlert, CreatePriceAlertPayload } from '@/types/priceAlert.types';

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
