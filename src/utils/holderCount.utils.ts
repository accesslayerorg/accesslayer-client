import { formatCompactNumber } from '@/utils/numberFormat.utils';

export interface HolderCountCopy {
  value: string;
  explanation: string;
}

export function getFeaturedCreatorKeyHolderCopy(
  count: number | null | undefined
): HolderCountCopy {
  if (count == null) {
    return {
      value: 'Key holders unavailable',
      explanation: 'Key holder data is not available yet.',
    };
  }
  if (count === 0) {
    return {
      value: 'No key holders yet',
      explanation:
        'This creator has not unlocked any key holders yet. Be the first to buy a key and start the collector base.',
    };
  }
  return {
    value: `${formatCompactNumber(count)} key holders`,
    explanation: 'Number of wallets that currently hold at least one key.',
  };
}
