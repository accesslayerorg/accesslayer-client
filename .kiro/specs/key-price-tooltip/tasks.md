# Implementation Plan: Key Price Tooltip

## Overview

Enhance `KeySupplyBadge` with a rich tooltip showing key price metadata (last-updated timestamp and quote source). The work is split into three steps: extend the `Tooltip` component, add the formatting utility and tooltip content component, then wire everything into `KeySupplyBadge`.

## Tasks

- [x]  1. Extend Tooltip component to accept ReactNode content
   - Widen the `content` prop type from `string` to `React.ReactNode` in `src/components/ui/tooltip.tsx`
   - Add a stable `id` to the overlay `<div>` using `useId`
   - Track visibility in local state so `aria-describedby` can be conditionally applied on the trigger wrapper
   - Replace `whitespace-nowrap` with `whitespace-normal` on the overlay to support multi-line content
   - Ensure the overlay retains `role="tooltip"` and existing dark-background / rounded / shadow classes
   - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.3, 6.1, 6.2, 7.1, 7.2_

   - [x]\* 1.1 Write property test for Tooltip visibility (Property 1)
      - **Property 1: Tooltip visibility follows activation state**
      - **Validates: Requirements 1.1, 1.2, 1.4**

   - [x]\* 1.2 Write property test for Tooltip tap toggle (Property 2)
      - **Property 2: Tooltip toggles on tap**
      - **Validates: Requirements 1.3**

   - [x]\* 1.3 Write property test for role="tooltip" always present (Property 7)
      - **Property 7: Tooltip overlay always carries role="tooltip"**
      - **Validates: Requirements 5.1**

   - [x]\* 1.4 Write property test for aria-describedby tracking visibility (Property 8)
      - **Property 8: aria-describedby tracks tooltip visibility**
      - **Validates: Requirements 5.2, 5.3**

   - [x]\* 1.5 Write property test for CSS classes always present (Property 9)
      - **Property 9: Tooltip overlay carries expected CSS classes**
      - **Validates: Requirements 6.1**

   - [x]\* 1.6 Write property test for ReactNode content renders unchanged (Property 10)
      - **Property 10: ReactNode content renders unchanged**
      - **Validates: Requirements 7.1, 7.2**

- [x]  2. Checkpoint — Ensure all Tooltip tests pass
   - Ensure all tests pass, ask the user if questions arise.

- [x]  3. Implement formatRelativeTime utility and KeyPriceTooltipContent component
   - Add `formatRelativeTime(iso: string | null | undefined): string` as a pure function co-located in `src/components/common/KeySupplyBadge.tsx`
      - Returns `"just now"` for < 60 s, `"Updated N min ago"` for minutes, `"Updated N hr ago"` for hours, `"Updated N day(s) ago"` for days
      - Returns `"Last updated: N/A"` for null, undefined, or unparseable input
   - Add unexported `KeyPriceTooltipContent` React component in the same file
      - Renders `formatRelativeTime(lastUpdated)` on the first line
      - Renders `"Source: <quoteSource>"` or `"Source: N/A"` on the second line
   - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1_

   - [x]\* 3.1 Write property test for formatRelativeTime output format (Property 3)
      - **Property 3: Relative time formatting**
      - **Validates: Requirements 2.1, 2.2**

   - [x]\* 3.2 Write property test for source label rendering (Property 4)
      - **Property 4: Source label rendering**
      - **Validates: Requirements 3.1, 3.2**

   - [x]\* 3.3 Write unit test for fully missing data renders all N/A fallbacks (Property 5)
      - **Property 5: Fully missing data renders all N/A fallbacks**
      - Render `<KeyPriceTooltipContent tooltipContent={{}} />` and assert both N/A strings are present
      - **Validates: Requirements 4.1**

   - [x]\* 3.4 Write unit tests for formatRelativeTime edge cases
      - Cover: future date, exactly 0 s, 59 s, 60 s, 59 min, 60 min, 23 hr, 24 hr, invalid string
      - _Requirements: 2.1, 2.2_

- [x]  4. Checkpoint — Ensure all utility and content component tests pass
   - Ensure all tests pass, ask the user if questions arise.

- [x]  5. Wire tooltip into KeySupplyBadge
   - Add `TooltipContent` interface and optional `tooltipContent` prop to `KeySupplyBadgeProps` in `src/components/common/KeySupplyBadge.tsx`
   - When `tooltipContent` is provided, wrap the existing badge output in `<Tooltip content={<KeyPriceTooltipContent ... />}>`
   - When `tooltipContent` is absent, render the badge exactly as before (no wrapper, no visual change)
   - _Requirements: 4.2, 6.3_

   - [x]\* 5.1 Write unit test for badge unchanged without tooltipContent (Property 6)
      - **Property 6: Badge is unchanged without tooltipContent**
      - Render `<KeySupplyBadge supply={42} />` and assert no tooltip wrapper in output
      - **Validates: Requirements 4.2, 6.3**

   - [x]\* 5.2 Write unit test for backward compatibility of Tooltip with string content
      - Render `<Tooltip content="hello">` and assert the string renders correctly
      - _Requirements: 7.1_

- [x]  6. Final checkpoint — Ensure all tests pass
   - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** with a minimum of 100 iterations each
- Every property test should be tagged: `// Feature: key-price-tooltip, Property <N>: <description>`
- `KeyPriceTooltipContent` is intentionally unexported — it is an implementation detail of `KeySupplyBadge`
- No new services, stores, or API calls are introduced; this is a pure component-layer change
