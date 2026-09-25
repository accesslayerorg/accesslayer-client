import { act, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from '@/hooks/useDebounce';

const DEBOUNCE_DELAY_MS = 500;

function DebouncedProbe({
	initialValue = 'initial',
	onDebouncedChange,
}: {
	initialValue?: string;
	onDebouncedChange?: (value: string) => void;
}) {
	const [value, setValue] = useState(initialValue);
	const debouncedValue = useDebounce(value, DEBOUNCE_DELAY_MS);

	useEffect(() => {
		onDebouncedChange?.(debouncedValue);
	}, [debouncedValue, onDebouncedChange]);

	return (
		<div>
			<button type="button" onClick={() => setValue('updated')}>
				Update value
			</button>
			<div data-testid="debounced-value">{debouncedValue}</div>
		</div>
	);
}

describe('useDebounce integration (#498)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('clears the timeout on unmount so no state update fires after unmount', () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		const onDebouncedChange = vi.fn();

		const { unmount } = render(
			<DebouncedProbe onDebouncedChange={onDebouncedChange} />
		);

		onDebouncedChange.mockClear();

		act(() => {
			screen.getByRole('button', { name: /update value/i }).click();
		});

		unmount();

		act(() => {
			vi.advanceTimersByTime(DEBOUNCE_DELAY_MS + 100);
		});

		expect(onDebouncedChange).not.toHaveBeenCalled();
		expect(consoleError).not.toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it('does not apply a pending debounced update after unmount when timers advance', () => {
		const onDebouncedChange = vi.fn();

		const { unmount, getByTestId } = render(
			<DebouncedProbe
				initialValue="stable"
				onDebouncedChange={onDebouncedChange}
			/>
		);

		expect(getByTestId('debounced-value')).toHaveTextContent('stable');
		onDebouncedChange.mockClear();

		act(() => {
			screen.getByRole('button', { name: /update value/i }).click();
		});

		unmount();

		act(() => {
			vi.advanceTimersByTime(DEBOUNCE_DELAY_MS + 100);
		});

		expect(onDebouncedChange).not.toHaveBeenCalled();
	});
});
