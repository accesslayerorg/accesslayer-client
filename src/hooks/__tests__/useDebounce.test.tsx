import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce – integration (fake timers)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not update the debounced value before the delay elapses', () => {
		const { result } = renderHook(() => {
			const [value, setValue] = useState('initial');
			const debounced = useDebounce(value, 300);
			return { value, setValue, debounced };
		});

		act(() => {
			result.current.setValue('updated');
		});

		// Immediately after the change the debounced value must still be the old one.
		expect(result.current.debounced).toBe('initial');
	});

	it('updates the debounced value after the delay elapses', () => {
		const { result } = renderHook(() => {
			const [value, setValue] = useState('initial');
			const debounced = useDebounce(value, 300);
			return { value, setValue, debounced };
		});

		act(() => {
			result.current.setValue('updated');
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(result.current.debounced).toBe('updated');
	});

	it('resets the timer on each new value during the debounce window', () => {
		const { result } = renderHook(() => {
			const [value, setValue] = useState('a');
			const debounced = useDebounce(value, 300);
			return { value, setValue, debounced };
		});

		act(() => {
			result.current.setValue('b');
		});
		act(() => {
			vi.advanceTimersByTime(150);
		});
		// Still within the window — another update resets the timer.
		act(() => {
			result.current.setValue('c');
		});
		act(() => {
			vi.advanceTimersByTime(150);
		});
		// Only 150 ms have passed since the last update, not yet 300 ms.
		expect(result.current.debounced).toBe('a');

		act(() => {
			vi.advanceTimersByTime(150);
		});
		// Now the full 300 ms have elapsed since the last value change.
		expect(result.current.debounced).toBe('c');
	});
});
