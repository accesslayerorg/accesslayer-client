import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from '@/hooks/useIsMobile';

type MQCallback = (event: Pick<MediaQueryListEvent, 'matches'>) => void;

interface MockMQL {
	matches: boolean;
	addEventListener: (event: string, cb: MQCallback) => void;
	removeEventListener: (event: string, cb: MQCallback) => void;
	_fire: (newMatches: boolean) => void;
}

function mockViewportWidth(widthPx: number): MockMQL {
	const matches = widthPx < 768;
	const listeners: MQCallback[] = [];
	const mql: MockMQL = {
		matches,
		addEventListener: (_event: string, cb: MQCallback) => listeners.push(cb),
		removeEventListener: (_event: string, cb: MQCallback) => {
			const idx = listeners.indexOf(cb);
			if (idx !== -1) listeners.splice(idx, 1);
		},
		_fire: (newMatches: boolean) => {
			mql.matches = newMatches;
			listeners.forEach(cb => cb({ matches: newMatches }));
		},
	};

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockReturnValue(mql),
	});

	return mql;
}

function MobileProbe() {
	const isMobile = useIsMobile();
	return <div data-testid="mobile-state">{isMobile ? 'mobile' : 'desktop'}</div>;
}

describe('useIsMobile integration (#485)', () => {
	let mql: MockMQL;

	beforeEach(() => {
		mql = mockViewportWidth(500);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns true below 768px', () => {
		render(<MobileProbe />);
		expect(screen.getByTestId('mobile-state')).toHaveTextContent('mobile');
	});

	it('returns false at or above 768px', () => {
		mql = mockViewportWidth(1024);
		render(<MobileProbe />);
		expect(screen.getByTestId('mobile-state')).toHaveTextContent('desktop');
	});

	it('updates correctly when the viewport is resized in both directions', () => {
		render(<MobileProbe />);
		expect(screen.getByTestId('mobile-state')).toHaveTextContent('mobile');

		act(() => {
			mql._fire(false);
		});
		expect(screen.getByTestId('mobile-state')).toHaveTextContent('desktop');

		act(() => {
			mql._fire(true);
		});
		expect(screen.getByTestId('mobile-state')).toHaveTextContent('mobile');
	});

	it('cleans up the media query listener on unmount', () => {
		const removeSpy = vi.spyOn(mql, 'removeEventListener');
		const { unmount } = render(<MobileProbe />);
		unmount();
		expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
	});
});
