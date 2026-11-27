import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/** localStorage key for the explicit reduce-motion override. */
export const REDUCED_MOTION_STORAGE_KEY = 'accesslayer.motion-reduced';

interface MotionOverrideState {
	/** Explicit user choice; `null` follows the OS preference. */
	override: boolean | null;
	setOverride: (override: boolean | null) => void;
}

/**
 * Persisted user override for reduced motion. Kept separate from the OS
 * preference (`usePrefersReducedMotion`) so a toggle in settings can win in
 * both directions.
 */
export const useMotionOverrideStore = create<MotionOverrideState>()(
	persist(
		set => ({
			override: null,
			setOverride: override => set({ override }),
		}),
		{
			name: REDUCED_MOTION_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
		}
	)
);

/**
 * Resolves the effective reduced-motion state, combining the OS
 * `prefers-reduced-motion` preference with the user's settings override.
 * The override wins in both directions, so users can opt into reduced motion
 * (or back out of it) even when that disagrees with their operating system.
 */
export function useReducedMotion(): boolean {
	const prefersReducedMotion = usePrefersReducedMotion();
	const override = useMotionOverrideStore(state => state.override);
	return override ?? prefersReducedMotion;
}
