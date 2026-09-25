import { formatKeyPrice } from '@/utils/keyPriceDisplay.utils';

interface TimelineEntryWithTimestamp {
  timestamp?: number;
}

export const groupEntriesByDate = <T extends TimelineEntryWithTimestamp>(entries: T[]) => {
  const groups: { [dateKey: string]: T[] } = {};
  for (const entry of entries) {
    const date = entry.timestamp ? new Date(entry.timestamp) : new Date();
    const dateKey = date.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(entry);
  }
  return Object.entries(groups).map(([dateKey, entries]) => ({
    date: new Date(dateKey),
    entries,
  }));
};

export const formatDateHeader = (date: Date) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
};

/**
 * Formats an activity amount (buy/sell) with a sign prefix and XLM suffix.
 * Buys are prefixed with '-', sells with '+'.
 */
export function formatActivityAmount(amount: bigint, type: 'buy' | 'sell'): string {
	if (amount === 0n) {
		return '+0.00 XLM';
	}
	const sign = type === 'buy' ? '-' : '+';
	const formatted = formatKeyPrice(amount);
	return `${sign}${formatted}`;
}
