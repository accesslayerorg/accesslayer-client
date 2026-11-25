import { keccak256, toUtf8Bytes } from 'ethers';

export type LaunchPhase = 'inactive' | 'commit' | 'reveal' | 'settled';

export interface LaunchPhaseConfig {
	launchStartLedger?: number | null;
	launchCommitEndLedger?: number | null;
	launchRevealEndLedger?: number | null;
	launchSettled?: boolean | null;
}

export interface LaunchOrderSecret {
	keyId: string;
	walletAddress: string;
	amount: string;
	salt: string;
	commitmentHash: string;
	committed?: boolean;
	revealed?: boolean;
}

export interface LaunchPhaseState {
	phase: LaunchPhase;
	ledgersRemaining: number | null;
}

function isLedger(value: number | null | undefined): value is number {
	return value != null && Number.isSafeInteger(value) && value >= 0;
}

export function getLaunchPhaseState(
	config: LaunchPhaseConfig,
	currentLedger: number | null | undefined
): LaunchPhaseState {
	if (config.launchSettled) {
		return { phase: 'settled', ledgersRemaining: 0 };
	}

	const { launchStartLedger, launchCommitEndLedger, launchRevealEndLedger } =
		config;

	if (
		!isLedger(launchStartLedger) ||
		!isLedger(launchCommitEndLedger) ||
		!isLedger(launchRevealEndLedger) ||
		launchCommitEndLedger <= launchStartLedger ||
		launchRevealEndLedger <= launchCommitEndLedger ||
		!isLedger(currentLedger)
	) {
		return { phase: 'inactive', ledgersRemaining: null };
	}

	if (currentLedger >= launchRevealEndLedger) {
		return { phase: 'settled', ledgersRemaining: 0 };
	}

	if (currentLedger < launchStartLedger) {
		return { phase: 'inactive', ledgersRemaining: null };
	}

	if (currentLedger < launchCommitEndLedger) {
		return {
			phase: 'commit',
			ledgersRemaining: launchCommitEndLedger - currentLedger,
		};
	}

	return {
		phase: 'reveal',
		ledgersRemaining: launchRevealEndLedger - currentLedger,
	};
}

export function normalizeLaunchAmount(rawAmount: string): string | null {
	const amount = rawAmount.trim();
	if (!/^(?:\d+\.?\d*|\.\d+)$/.test(amount)) return null;
	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
	return amount;
}

export function createLaunchOrderSecret(
	keyId: string,
	walletAddress: string,
	amount: string
): LaunchOrderSecret {
	const normalizedAmount = normalizeLaunchAmount(amount);
	if (!keyId.trim()) throw new Error('A key is required to create an order.');
	if (!walletAddress.trim())
		throw new Error('Connect a wallet to create an order.');
	if (!normalizedAmount) throw new Error('Enter a valid order amount.');
	if (!globalThis.crypto?.getRandomValues) {
		throw new Error('Secure random number generation is unavailable.');
	}

	const saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
	const salt = `0x${Array.from(saltBytes, byte =>
		byte.toString(16).padStart(2, '0')
	).join('')}`;
	const normalizedWallet = walletAddress.trim().toLowerCase();
	const commitmentHash = hashLaunchOrder(
		keyId,
		normalizedWallet,
		normalizedAmount,
		salt
	);

	return {
		keyId,
		walletAddress: normalizedWallet,
		amount: normalizedAmount,
		salt,
		commitmentHash,
	};
}

export function hashLaunchOrder(
	keyId: string,
	walletAddress: string,
	amount: string,
	salt: string
): string {
	return keccak256(
		toUtf8Bytes(
			JSON.stringify([
				keyId,
				walletAddress.trim().toLowerCase(),
				amount,
				salt.toLowerCase(),
			])
		)
	);
}

export function parseLaunchOrderBackup(
	value: unknown,
	keyId: string,
	walletAddress: string
): LaunchOrderSecret {
	if (!value || typeof value !== 'object') {
		throw new Error('The backup file is not a valid launch order backup.');
	}

	const backup = value as Partial<LaunchOrderSecret>;
	if (
		backup.keyId !== keyId ||
		typeof backup.walletAddress !== 'string' ||
		backup.walletAddress.trim().toLowerCase() !==
			walletAddress.trim().toLowerCase() ||
		typeof backup.amount !== 'string' ||
		normalizeLaunchAmount(backup.amount) !== backup.amount ||
		typeof backup.salt !== 'string' ||
		!/^0x[0-9a-f]{64}$/i.test(backup.salt) ||
		typeof backup.commitmentHash !== 'string' ||
		!/^0x[0-9a-f]{64}$/i.test(backup.commitmentHash)
	) {
		throw new Error(
			'This backup does not match the connected wallet and key.'
		);
	}

	const expectedHash = hashLaunchOrder(
		backup.keyId,
		backup.walletAddress,
		backup.amount,
		backup.salt
	);
	if (backup.commitmentHash.toLowerCase() !== expectedHash.toLowerCase()) {
		throw new Error('The backup file failed its integrity check.');
	}

	return {
		keyId: backup.keyId,
		walletAddress: backup.walletAddress.trim().toLowerCase(),
		amount: backup.amount,
		salt: backup.salt.toLowerCase(),
		commitmentHash: expectedHash,
		committed: backup.committed === true,
		revealed: backup.revealed === true,
	};
}

export function getLaunchPhaseCountdown(ledgersRemaining: number | null): {
	seconds: number | null;
	label: string | null;
} {
	if (ledgersRemaining == null) return { seconds: null, label: null };
	const seconds = Math.max(0, ledgersRemaining) * 5;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	const label =
		minutes > 0
			? `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
			: `${remainingSeconds}s`;
	return { seconds, label };
}
