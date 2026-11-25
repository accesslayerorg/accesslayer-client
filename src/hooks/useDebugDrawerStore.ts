import { create } from 'zustand';

interface DebugDrawerStore {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
}

export const useDebugDrawerStore = create<DebugDrawerStore>(set => ({
	isOpen: false,
	open: () => set({ isOpen: true }),
	close: () => set({ isOpen: false }),
	toggle: () => set(state => ({ isOpen: !state.isOpen })),
}));
