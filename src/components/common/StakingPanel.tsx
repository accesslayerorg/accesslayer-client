import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCountdownTime } from '@/utils/lockupCountdown.utils';

export interface StakingPanelProps {
	key_id: string | number;
	unlock_ledger: number;
	onClaim: (keyId: string | number) => void | Promise<void>;
}

const getRemainingSeconds = (unlockLedger: number): number =>
	Math.max(0, Math.ceil((unlockLedger * 1000 - Date.now()) / 1000));

const StakingPanel: React.FC<StakingPanelProps> = ({ key_id, unlock_ledger, onClaim }) => {
	const [remainingSeconds, setRemainingSeconds] = useState(() =>
		getRemainingSeconds(unlock_ledger)
	);

	useEffect(() => {
		const updateRemaining = () => setRemainingSeconds(getRemainingSeconds(unlock_ledger));
		updateRemaining();

		const intervalId = setInterval(updateRemaining, 1000);
		return () => clearInterval(intervalId);
	}, [unlock_ledger]);

	const isLocked = remainingSeconds > 0;

	return (
		<section data-testid="staking-panel">
			<span data-testid="staking-lock-countdown">
				{formatCountdownTime(remainingSeconds)}
			</span>
			<Button
				onClick={() => onClaim(key_id)}
				disabled={isLocked}
				data-testid="staking-claim-button"
			>
				Claim
			</Button>
		</section>
	);
};

export default StakingPanel;