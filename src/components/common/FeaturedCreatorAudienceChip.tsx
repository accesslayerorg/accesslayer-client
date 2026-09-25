import MiniStatChip from '@/components/common/MiniStatChip';
import { useCreatorHolderCount } from '@/hooks/useCreatorHolderCount';
import { getFeaturedCreatorKeyHolderCopy } from '@/utils/holderCount.utils';

interface FeaturedCreatorAudienceChipProps {
  creatorId: string;
  fetchHolderCount: (id: string) => Promise<number | null>;
}

export function FeaturedCreatorAudienceChip({
  creatorId,
  fetchHolderCount,
}: FeaturedCreatorAudienceChipProps) {
  const { count } = useCreatorHolderCount(creatorId, fetchHolderCount);
  const copy = getFeaturedCreatorKeyHolderCopy(count);

  return (
    <MiniStatChip
      label="Audience"
      value={copy.value}
      explanation={copy.explanation}
    />
  );
}
