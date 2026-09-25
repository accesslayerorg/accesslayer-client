# Utils Testing Guide

## Naming Convention & Co-location

- Test files should be named **`<helperName>.test.ts`** (or `.test.tsx` for React‑related helpers).
- Place the test file **side‑by‑side** with the helper it exercises, inside the same directory.

   Example directory layout:

   ```
   src/utils/
     ├─ formatNumber.utils.ts
     └─ formatNumber.utils.test.ts   ← test file
   ```

## Running Only Util Tests

The project uses **Vitest** as the test runner (configured in `vitest.config.ts`).

- To run **all** tests: `pnpm test`
- To run **only utils** tests:
   ```bash
   pnpm test "src/utils/**/*.test.ts"
   ```
   This pattern matches every test file under `src/utils`.

## Worked Example Test

Below is a simple example for a pure helper `formatNumber` that formats a number with commas and two decimal places.

```ts
// src/utils/formatNumber.utils.test.ts
import { describe, expect, it } from 'vitest';
import { formatNumber } from './formatNumber.utils';

describe('formatNumber utils', () => {
	it('formats an integer with commas', () => {
		expect(formatNumber(1234567)).toBe('1,234,567.00');
	});

	it('formats a floating‑point number with two decimals', () => {
		expect(formatNumber(1234.5)).toBe('1,234.50');
	});

	it('handles negative numbers', () => {
		expect(formatNumber(-9876.543)).toBe('-9,876.54');
	});
});
```

### Explanation

- **`describe`** groups related tests under a readable heading.
- **`it`** defines individual test cases.
- **`expect(...).toBe(...)`** performs the assertion.
- Because `formatNumber` is a **pure function** (no side‑effects), we can achieve **100 % branch coverage** with the three cases above (positive, decimal, negative).

## Branch Coverage Expectation

- **Pure helpers** (functions that depend only on their inputs) must have **100 % branch coverage**.
- Run the coverage report with:
   ```bash
   pnpm test --coverage
   ```
- Ensure the generated `coverage` report shows `100%` for each pure helper file.

---

_This guide lives in the repository under `docs/utils-testing-guide.md` and should be referenced by contributors when adding new utility helpers._
