import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	REDUCED_MOTION_STORAGE_KEY,
	useMotionOverrideStore,
	useReducedMotion,
} from '@/hooks/useReducedMotion';
import MotionSettingsSection from '@/components/settings/MotionSettingsSection';

type MQCallback = (event: Pick<MediaQueryListEvent, 'matches'>) => void;

interface MockMQL {
	matches: boolean;
	addEventListener: (event: string, cb: MQCallback) => void;
	removeEventListener: (event: string, cb: MQCallback) => void;
	fire: (next: boolean) => void;
}

/** Installs a controllable `matchMedia` stub for jsdom. */
function mockReducedMotion(matches: boolean): MockMQL {
	const listeners: MQCallback[] = [];
	const mql: MockMQL = {
		matches,
		addEventListener: (_event, cb) => listeners.push(cb),
		removeEventListener: (_event, cb) => {
			const index = listeners.indexOf(cb);
			if (index !== -1) listeners.splice(index, 1);
		},
		fire: next => {
			mql.matches = next;
			listeners.forEach(cb => cb({ matches: next }));
		},
	};

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn(() => mql),
	});

	return mql;
}

function ReducedMotionProbe() {
	const reducedMotion = useReducedMotion();
	return (
		<span data-testid="reduced-motion-probe">
			{reducedMotion ? 'reduced' : 'full'}
		</span>
	);
}

describe('useReducedMotion', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useMotionOverrideStore.setState({ override: null });
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('follows the OS preference when there is no override', () => {
		const mql = mockReducedMotion(true);
		render(<ReducedMotionProbe />);
		expect(screen.getByTestId('reduced-motion-probe')).toHaveTextContent(
			'reduced'
		);

		act(() => mql.fire(false));
		expect(screen.getByTestId('reduced-motion-probe')).toHaveTextContent(
			'full'
		);
	});

	it('lets an override force reduced motion on', () => {
		mockReducedMotion(false);
		render(<ReducedMotionProbe />);
		expect(screen.getByTestId('reduced-motion-probe')).toHaveTextContent(
			'full'
		);

		act(() => useMotionOverrideStore.getState().setOverride(true));
		expect(screen.getByTestId('reduced-motion-probe')).toHaveTextContent(
			'reduced'
		);
	});

	it('lets an override force motion back on', () => {
		mockReducedMotion(true);
		render(<ReducedMotionProbe />);
		expect(screen.getByTestId('reduced-motion-probe')).toHaveTextContent(
			'reduced'
		);

		act(() => useMotionOverrideStore.getState().setOverride(false));
		expect(screen.getByTestId('reduced-motion-probe')).toHaveTextContent(
			'full'
		);
	});
});

describe('MotionSettingsSection', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useMotionOverrideStore.setState({ override: null });
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('reflects the effective state and persists the override', async () => {
		mockReducedMotion(false);
		const user = userEvent.setup();
		render(<MotionSettingsSection />);

		const toggle = screen.getByTestId('reduce-motion-toggle');
		expect(toggle).toHaveAttribute('aria-checked', 'false');

		await user.click(toggle);

		expect(toggle).toHaveAttribute('aria-checked', 'true');
		expect(
			window.localStorage.getItem(REDUCED_MOTION_STORAGE_KEY)
		).toContain('"override":true');
	});
});
