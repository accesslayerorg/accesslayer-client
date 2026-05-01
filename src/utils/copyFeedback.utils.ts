/**
 * Copy feedback utilities to prevent rapid repeated copy-feedback spam
 */

export interface CopyFeedbackState {
	isOnCooldown: boolean;
	lastCopyTime: number;
}

export interface CopyFeedbackOptions {
	/** Cooldown period in milliseconds. Defaults to 2000ms. */
	cooldownMs?: number;
	/** Whether to maintain immediate feedback on first click. Defaults to true. */
	immediateFirstClick?: boolean;
}

/**
 * Manages copy feedback state to prevent spam
 */
export class CopyFeedbackManager {
	private state: Map<string, CopyFeedbackState> = new Map();
	private readonly defaultCooldownMs = 2000;

	/**
	 * Checks if copy action should show feedback
	 * 
	 * @param key - Unique identifier for the copy action (e.g., button ID, content hash)
	 * @param options - Configuration options
	 * @returns Whether to show feedback and the action state
	 */
	shouldShowFeedback(key: string, options: CopyFeedbackOptions = {}): { 
		shouldShow: boolean; 
		isFirstClick: boolean;
	} {
		const { cooldownMs = this.defaultCooldownMs, immediateFirstClick = true } = options;
		const now = Date.now();
		const existing = this.state.get(key);

		if (!existing) {
			// First time copying this content
			this.state.set(key, {
				isOnCooldown: immediateFirstClick,
				lastCopyTime: now
			});
			return { shouldShow: true, isFirstClick: true };
		}

		const timeSinceLastCopy = now - existing.lastCopyTime;

		if (existing.isOnCooldown && timeSinceLastCopy < cooldownMs) {
			// Still on cooldown
			return { shouldShow: false, isFirstClick: false };
		}

		// Cooldown expired, allow feedback again
		this.state.set(key, {
			isOnCooldown: true,
			lastCopyTime: now
		});
		return { shouldShow: true, isFirstClick: false };
	}

	/**
	 * Forces feedback to show regardless of cooldown (useful for errors)
	 * 
	 * @param key - Unique identifier for the copy action
	 */
	forceFeedback(key: string): void {
		this.state.set(key, {
			isOnCooldown: true,
			lastCopyTime: Date.now()
		});
	}

	/**
	 * Clears cooldown for a specific key
	 * 
	 * @param key - Unique identifier for the copy action
	 */
	clearCooldown(key: string): void {
		const existing = this.state.get(key);
		if (existing) {
			this.state.set(key, {
				...existing,
				isOnCooldown: false
			});
		}
	}

	/**
	 * Clears all cooldown states
	 */
	clearAllCooldowns(): void {
		this.state.clear();
	}

	/**
	 * Gets remaining cooldown time for a key
	 * 
	 * @param key - Unique identifier for the copy action
	 * @param options - Configuration options
	 * @returns Remaining cooldown time in milliseconds
	 */
	getRemainingCooldown(key: string, options: CopyFeedbackOptions = {}): number {
		const { cooldownMs = this.defaultCooldownMs } = options;
		const existing = this.state.get(key);
		
		if (!existing || !existing.isOnCooldown) {
			return 0;
		}

		const timeSinceLastCopy = Date.now() - existing.lastCopyTime;
		return Math.max(0, cooldownMs - timeSinceLastCopy);
	}
}

// Global instance for app-wide usage
export const copyFeedbackManager = new CopyFeedbackManager();

/**
 * Hook-friendly function for managing copy feedback
 * 
 * @param key - Unique identifier for the copy action
 * @param options - Configuration options
 * @returns Object with feedback state and actions
 */
export function useCopyFeedback(key: string, options: CopyFeedbackOptions = {}) {
	const shouldShow = () => copyFeedbackManager.shouldShowFeedback(key, options);
	const forceShow = () => copyFeedbackManager.forceFeedback(key);
	const clearCooldown = () => copyFeedbackManager.clearCooldown(key);
	const getRemainingCooldown = () => copyFeedbackManager.getRemainingCooldown(key, options);

	return {
		shouldShow,
		forceShow,
		clearCooldown,
		getRemainingCooldown
	};
}

/**
 * Simple function for one-off copy feedback checks
 * 
 * @param key - Unique identifier for the copy action
 * @param options - Configuration options
 * @returns Whether to show feedback
 */
export function shouldShowCopyFeedback(key: string, options: CopyFeedbackOptions = {}): boolean {
	return copyFeedbackManager.shouldShowFeedback(key, options).shouldShow;
}
