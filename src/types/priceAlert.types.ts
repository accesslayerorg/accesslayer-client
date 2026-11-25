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

export interface ChartAnnotation {
  id: string;
  keyId: string;
  /** ISO timestamp of the annotation's position on the time axis. */
  time: string;
  /** Price at the annotation's position. */
  price: number;
  text: string;
}

export interface ChartZoomRange {
  /** ISO timestamp marking the start of the zoomed range. */
  start: string;
  /** ISO timestamp marking the end of the zoomed range. */
  end: string;
}

export interface ChartCrosshairPoint {
  /** ISO timestamp at the cursor position. */
  time: string;
  price: number;
  volume: number;
  /** Price change relative to the previous data point. */
  change: number;
}