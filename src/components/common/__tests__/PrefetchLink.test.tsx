import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PrefetchLink } from '../PrefetchLink';
import {
	enqueuePrefetch,
	cancelPrefetch,
	getActivePrefetchesCount,
	getPendingQueueLength,
	resetPrefetchState,
	shouldSkipPrefetch,
} from '@/utils/navigationPrefetch.utils';

describe('PrefetchLink and navigationPrefetch (#1490)', () => {
	beforeEach(() => {
		resetPrefetchState();
		vi.clearAllMocks();
	});

	afterEach(() => {
		resetPrefetchState();
	});

	it('renders as standard anchor element', () => {
		render(
			<MemoryRouter>
				<PrefetchLink to="/marketplace">Explore Marketplace</PrefetchLink>
			</MemoryRouter>
		);

		const anchor = screen.getByRole('link', { name: 'Explore Marketplace' });
		expect(anchor).toBeInTheDocument();
		expect(anchor).toHaveAttribute('href', '/marketplace');
	});

	it('limits concurrent prefetches to 3', async () => {
		let resolve1!: () => void;
		let resolve2!: () => void;
		let resolve3!: () => void;
		let resolve4!: () => void;

		const p1 = new Promise<void>(res => { resolve1 = res; });
		const p2 = new Promise<void>(res => { resolve2 = res; });
		const p3 = new Promise<void>(res => { resolve3 = res; });
		const p4 = new Promise<void>(res => { resolve4 = res; });

		enqueuePrefetch('/route-1', () => p1);
		enqueuePrefetch('/route-2', () => p2);
		enqueuePrefetch('/route-3', () => p3);
		enqueuePrefetch('/route-4', () => p4);

		expect(getActivePrefetchesCount()).toBe(3);
		expect(getPendingQueueLength()).toBe(1);

		// Complete one task
		await act(async () => {
			resolve1();
		});

		expect(getActivePrefetchesCount()).toBe(3);
		expect(getPendingQueueLength()).toBe(0);

		await act(async () => {
			resolve2();
			resolve3();
			resolve4();
		});

		expect(getActivePrefetchesCount()).toBe(0);
	});

	it('cancels pending prefetch when cancelled', () => {
		const p = new Promise<void>(() => {});
		enqueuePrefetch('/active-1', () => p);
		enqueuePrefetch('/active-2', () => p);
		enqueuePrefetch('/active-3', () => p);
		enqueuePrefetch('/pending-to-cancel', () => p);

		expect(getPendingQueueLength()).toBe(1);
		cancelPrefetch('/pending-to-cancel');
		expect(getPendingQueueLength()).toBe(0);
	});

	it('skips prefetching on data saver mode', () => {
		const originalNavigator = global.navigator;
		Object.defineProperty(global, 'navigator', {
			value: {
				...originalNavigator,
				connection: {
					saveData: true,
					effectiveType: '4g',
				},
			},
			configurable: true,
		});

		expect(shouldSkipPrefetch()).toBe(true);

		const task = vi.fn().mockResolvedValue(undefined);
		enqueuePrefetch('/test-data-saver', task);
		expect(task).not.toHaveBeenCalled();

		Object.defineProperty(global, 'navigator', {
			value: originalNavigator,
			configurable: true,
		});
	});

	it('triggers prefetch on mouse enter and focus', () => {
		render(
			<MemoryRouter>
				<PrefetchLink to="/creator/creator-1">Creator Key</PrefetchLink>
			</MemoryRouter>
		);

		const link = screen.getByRole('link', { name: 'Creator Key' });
		fireEvent.mouseEnter(link);
		fireEvent.focus(link);
		expect(link).toBeInTheDocument();
	});
});
