import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatRelativeTime } from '@/utils/keyPrice.utils';
import KeySupplyBadge from '../KeySupplyBadge';
import { Tooltip } from '../../ui/tooltip';

// ---------------------------------------------------------------------------
// Feature: key-price-tooltip, Property 3: Relative time formatting
// Validates: Requirements 2.1, 2.2
// ---------------------------------------------------------------------------
describe('Property 3: Relative time formatting', () => {
  it('returns "Last updated: N/A" for null', () => {
    expect(formatRelativeTime(null)).toBe('Last updated: N/A');
  });

  it('returns "Last updated: N/A" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('Last updated: N/A');
  });

  it('valid past ISO strings produce "just now" or "Updated N <unit> ago"', () => {
    // Generate timestamps between 0 and 30 days in the past
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }),
        (offsetMs) => {
          const iso = new Date(Date.now() - offsetMs).toISOString();
          const result = formatRelativeTime(iso);
          const validPattern =
            result === 'Updated just now' ||
            /^Updated \d+ min ago$/.test(result) ||
            /^Updated \d+ hr ago$/.test(result) ||
            /^Updated \d+ days? ago$/.test(result);
          return validPattern;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('null/undefined always returns exactly "Last updated: N/A"', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null as null | undefined), fc.constant(undefined as null | undefined)),
        (val) => formatRelativeTime(val) === 'Last updated: N/A',
      ),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: key-price-tooltip, Property 4: Source label rendering
// Validates: Requirements 3.1, 3.2
// ---------------------------------------------------------------------------
describe('Property 4: Source label rendering', () => {
  it('non-empty quoteSource renders "Source: <quoteSource>"', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), (source) => {
        const { container, unmount } = render(
          <KeySupplyBadge tooltipContent={{ quoteSource: source }} />,
        );
        expect(container.textContent).toContain(`Source: ${source}`);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('null quoteSource renders "Source: N/A"', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant('')),
        (source) => {
          const { container, unmount } = render(
            <KeySupplyBadge tooltipContent={{ quoteSource: source }} />,
          );
          expect(container.textContent).toContain('Source: N/A');
          unmount();
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: key-price-tooltip, Property 5: Fully missing data renders all N/A fallbacks
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------
describe('Property 5: Fully missing data renders all N/A fallbacks', () => {
  it('renders both N/A strings when no fields are provided', () => {
    render(<KeySupplyBadge tooltipContent={{}} />);
    expect(screen.getByText('Last updated: N/A')).toBeInTheDocument();
    expect(screen.getByText('Source: N/A')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Unit tests for formatRelativeTime edge cases
// Validates: Requirements 2.1, 2.2
// ---------------------------------------------------------------------------
describe('formatRelativeTime edge cases', () => {
  function isoSecondsAgo(sec: number) {
    return new Date(Date.now() - sec * 1000).toISOString();
  }

  it('future timestamp → "just now"', () => {
    const future = new Date(Date.now() + 50_000).toISOString();
    expect(formatRelativeTime(future)).toBe('Updated just now');
  });

  it('0 seconds ago → "just now"', () => {
    expect(formatRelativeTime(isoSecondsAgo(0))).toBe('Updated just now');
  });

  it('59 seconds ago → "just now"', () => {
    expect(formatRelativeTime(isoSecondsAgo(59))).toBe('Updated just now');
  });

  it('60 seconds ago → "Updated 1 min ago"', () => {
    expect(formatRelativeTime(isoSecondsAgo(60))).toBe('Updated 1 min ago');
  });

  it('59 minutes ago → "Updated 59 min ago"', () => {
    expect(formatRelativeTime(isoSecondsAgo(59 * 60))).toBe('Updated 59 min ago');
  });

  it('60 minutes ago → "Updated 1 hr ago"', () => {
    expect(formatRelativeTime(isoSecondsAgo(60 * 60))).toBe('Updated 1 hr ago');
  });

  it('23 hours ago → "Updated 23 hr ago"', () => {
    expect(formatRelativeTime(isoSecondsAgo(23 * 3600))).toBe('Updated 23 hr ago');
  });

  it('24 hours ago → "Updated 1 day ago"', () => {
    expect(formatRelativeTime(isoSecondsAgo(24 * 3600))).toBe('Updated 1 day ago');
  });

  it('invalid string → "Last updated: N/A"', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Last updated: N/A');
  });
});

// ---------------------------------------------------------------------------
// Feature: key-price-tooltip, Property 6: Badge is unchanged without tooltipContent
// Validates: Requirements 4.2, 6.3
// ---------------------------------------------------------------------------
describe('Property 6: Badge is unchanged without tooltipContent', () => {
  it('renders no tooltip wrapper when tooltipContent is not provided', () => {
    const { container } = render(<KeySupplyBadge supply={42} />);
    // No element with role="tooltip" should be present
    expect(screen.queryByRole('tooltip')).toBeNull();
    // The root element should be the badge span directly (no extra wrapper div)
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility: Tooltip with string content
// Validates: Requirements 7.1
// ---------------------------------------------------------------------------
describe('Tooltip backward compatibility with string content', () => {
  it('renders string content inside the tooltip overlay', () => {
    render(
      <Tooltip content="hello">
        <button>x</button>
      </Tooltip>
    );
    const overlay = screen.getByRole('tooltip');
    expect(overlay.textContent).toBe('hello');
  });
});
