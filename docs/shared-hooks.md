# Contributing Shared Hooks

The `src/hooks` folder is for reusable stateful logic that is not specific to
one component. Put a hook here when multiple screens or components can share the
same state management, browser event handling, async coordination, or derived
behavior. Keep component-only logic near the component that owns it.

## Naming

Shared hooks must:

- Start with the `use` prefix.
- Export a hook whose name matches the file name.
- Use a file name that is identical to the hook name, for example
  `useExample.ts`.

## Tests

Every shared hook must include a corresponding test file in
`src/hooks/__tests__`. Name the test after the hook, for example
`useExample.test.ts` or `useExample.test.tsx`.

## Minimal Example

```ts
// src/hooks/useCounter.ts
import { useCallback, useState } from 'react';

export const useCounter = (initialValue = 0) => {
	const [count, setCount] = useState(initialValue);
	const increment = useCallback(() => setCount(value => value + 1), []);

	return { count, increment };
};
```

```ts
// src/hooks/__tests__/useCounter.test.ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
	it('increments from the initial value', () => {
		const { result } = renderHook(() => useCounter(2));

		act(() => result.current.increment());

		expect(result.current.count).toBe(3);
	});
});
```
