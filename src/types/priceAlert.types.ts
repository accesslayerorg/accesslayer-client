export type AlertDirection = 'above' | 'below';

export interface PriceAlert {
  id: string;
  creatorId: string;
  creatorTitle: string;
  thresholdStroops: number;
  direction: AlertDirection;
  createdAt: string;
  /** ISO timestamp when this alert last fired; null if never triggered. */
  lastTriggeredAt: string | null;
}

export interface CreatePriceAlertPayload {
  creatorId: string;
  creatorTitle: string;
  thresholdStroops: number;
  direction: AlertDirection;
}
