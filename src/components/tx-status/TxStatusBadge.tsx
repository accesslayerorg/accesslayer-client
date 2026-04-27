import React from 'react';
import { TxStatus } from './TxStatusLegend';

interface TxStatusBadgeProps {
  status: TxStatus;
}

const BADGE_STYLES: Record<TxStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABELS: Record<TxStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  success: 'Success',
  failed: 'Failed',
};

export function TxStatusBadge({ status }: TxStatusBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[status]}`}
      aria-label={`Transaction status: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}