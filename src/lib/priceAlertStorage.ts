import type { PriceAlert, CreatePriceAlertPayload } from '@/types/priceAlert.types';

const STORAGE_KEY = 'accesslayer:price-alerts';

export const priceAlertStorage = {
  getAll(): PriceAlert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as PriceAlert[];
    } catch {
      return [];
    }
  },

  add(payload: CreatePriceAlertPayload): PriceAlert {
    const alerts = priceAlertStorage.getAll();
    const newAlert: PriceAlert = {
      id: crypto.randomUUID(),
      creatorId: payload.creatorId,
      creatorTitle: payload.creatorTitle,
      thresholdStroops: payload.thresholdStroops,
      direction: payload.direction,
      createdAt: new Date().toISOString(),
      lastTriggeredAt: null,
    };
    alerts.push(newAlert);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    return newAlert;
  },

  update(id: string, patch: Partial<PriceAlert>): void {
    const alerts = priceAlertStorage.getAll();
    const index = alerts.findIndex(a => a.id === id);
    if (index === -1) return;
    alerts[index] = { ...alerts[index], ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  },

  remove(id: string): void {
    const alerts = priceAlertStorage.getAll().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  },

  markTriggered(id: string): void {
    priceAlertStorage.update(id, { lastTriggeredAt: new Date().toISOString() });
  },
};
