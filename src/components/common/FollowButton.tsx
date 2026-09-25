import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FollowButtonProps {
  creatorAddress: string;
  isFollowing: boolean;
  onFollow: (creatorAddress: string) => Promise<void>;
  onUnfollow: (creatorAddress: string) => Promise<void>;
}

export default function FollowButton({
  creatorAddress,
  isFollowing,
  onFollow,
  onUnfollow,
}: FollowButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow(creatorAddress);
      } else {
        await onFollow(creatorAddress);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={isFollowing ? 'outline' : 'default'}
      data-testid="follow-button"
    >
      {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}