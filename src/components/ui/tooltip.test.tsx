import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Tooltip } from './tooltip';

// Helper: render a Tooltip with given content and a trigger child
function renderTooltip(content: React.ReactNode) {
  return render(
    <Tooltip content={content}>
      <button>trigger</button>
    </Tooltip>,
  );
}

// Feature: key-price-tooltip, Property 1: Tooltip visibility follows activation state
// Validates: Requirements 1.1, 1.2, 1.4
describe('Property 1: Tooltip visibility follows activation state', () => {
  it('shows overlay on mouseenter and hides on mouseleave', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (content) => {
        const { container, unmount } = renderTooltip(content);
        const wrapper = container.firstChild as HTMLElement;

        // Initially hidden (CSS-only via group-hover, but aria-describedby absent)
        expect(wrapper).not.toHaveAttribute('aria-describedby');

        fireEvent.mouseEnter(wrapper);
        expect(wrapper).toHaveAttribute('aria-describedby');

        fireEvent.mouseLeave(wrapper);
        expect(wrapper).not.toHaveAttribute('aria-describedby');

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('shows overlay on focus and hides on blur', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (content) => {
        const { container, unmount } = renderTooltip(content);
        const wrapper = container.firstChild as HTMLElement;

        expect(wrapper).not.toHaveAttribute('aria-describedby');

        fireEvent.focus(wrapper);
        expect(wrapper).toHaveAttribute('aria-describedby');

        fireEvent.blur(wrapper);
        expect(wrapper).not.toHaveAttribute('aria-describedby');

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: key-price-tooltip, Property 2: Tooltip toggles on tap
// Validates: Requirements 1.3
describe('Property 2: Tooltip toggles on tap', () => {
  it('toggles visibility on click', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (content) => {
        const { container, unmount } = renderTooltip(content);
        const wrapper = container.firstChild as HTMLElement;

        expect(wrapper).not.toHaveAttribute('aria-describedby');

        fireEvent.click(wrapper);
        expect(wrapper).toHaveAttribute('aria-describedby');

        fireEvent.click(wrapper);
        expect(wrapper).not.toHaveAttribute('aria-describedby');

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: key-price-tooltip, Property 7: Tooltip overlay always carries role="tooltip"
// Validates: Requirements 5.1
describe('Property 7: role="tooltip" always present', () => {
  it('overlay always has role="tooltip"', () => {
    fc.assert(
      fc.property(fc.string(), (content) => {
        const { unmount } = renderTooltip(content);
        const overlay = screen.getByRole('tooltip');
        expect(overlay).toBeInTheDocument();
        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: key-price-tooltip, Property 8: aria-describedby tracks tooltip visibility
// Validates: Requirements 5.2, 5.3
describe('Property 8: aria-describedby tracks tooltip visibility', () => {
  it('aria-describedby matches overlay id when visible, absent when hidden', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (content) => {
        const { container, unmount } = renderTooltip(content);
        const wrapper = container.firstChild as HTMLElement;
        const overlay = screen.getByRole('tooltip');

        // Hidden: no aria-describedby
        expect(wrapper).not.toHaveAttribute('aria-describedby');

        // Show
        fireEvent.mouseEnter(wrapper);
        const describedBy = wrapper.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        expect(describedBy).toBe(overlay.id);

        // Hide
        fireEvent.mouseLeave(wrapper);
        expect(wrapper).not.toHaveAttribute('aria-describedby');

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: key-price-tooltip, Property 9: Tooltip overlay carries expected CSS classes
// Validates: Requirements 6.1
describe('Property 9: CSS classes always present on overlay', () => {
  it('overlay has bg-black, rounded-md, shadow-md classes', () => {
    fc.assert(
      fc.property(fc.string(), (content) => {
        const { unmount } = renderTooltip(content);
        const overlay = screen.getByRole('tooltip');
        expect(overlay.className).toContain('bg-black');
        expect(overlay.className).toContain('rounded-md');
        expect(overlay.className).toContain('shadow-md');
        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: key-price-tooltip, Property 10: ReactNode content renders unchanged
// Validates: Requirements 7.1, 7.2
describe('Property 10: ReactNode content renders unchanged', () => {
  it('string content renders inside the overlay', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (content) => {
        const { unmount } = renderTooltip(content);
        const overlay = screen.getByRole('tooltip');
        expect(overlay.textContent).toBe(content);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('ReactNode content renders inside the overlay', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (text) => {
        const node = <span data-testid="inner">{text}</span>;
        const { unmount } = renderTooltip(node);
        const overlay = screen.getByRole('tooltip');
        expect(overlay.textContent).toBe(text);
        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
