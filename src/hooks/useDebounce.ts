import { useEffect, useRef, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): [T, (v: T) => void] {
	const [debounced, setDebounced] = useState<T>(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		timerRef.current = setTimeout(() => setDebounced(value), delay);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [value, delay]);

	const flush = (v: T) => {
		if (timerRef.current) clearTimeout(timerRef.current);
		setDebounced(v);
	};

	return [debounced, flush];
}
