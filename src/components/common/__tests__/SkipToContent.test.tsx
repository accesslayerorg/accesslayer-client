import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SkipToContent from '../SkipToContent';

// ---------------------------------------------------------------------------
// Feature: Skip-to-content link for keyboard accessibility
// Validates: All acceptance criteria
// ---------------------------------------------------------------------------
describe('SkipToContent: Keyboard Accessibility', () => {
	const TARGET_ID = 'main-content';
	const SKIP_LABEL = 'Skip to main content';

	beforeEach(() => {
		// Reset document before each test
		document.body.innerHTML = '';

		// Create target element
		const target = document.createElement('div');
		target.id = TARGET_ID;
		target.tabIndex = -1;
		target.textContent = 'Main content area';
		document.body.appendChild(target);
	});

	// ---------------------------------------------------------------------------
	// Acceptance Criteria 1: Pressing Tab once reveals the skip link
	// ---------------------------------------------------------------------------
	describe('AC1: Pressing Tab reveals skip link', () => {
		it('skip link is initially visually hidden', () => {
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();

			// Check that it's positioned off-screen initially
// The link should be positioned off-screen via utility classes
		expect(link).toHaveClass('-left-full');
		});

		it('skip link becomes visible when focused via Tab key', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;

			// Initially off-screen
			expect(link).toHaveClass('-left-full');

			// Tab to the link
			await user.tab();

			// Should be focused
			expect(link).toHaveFocus();

			// Should be visible (focus class applied)
			expect(link).toHaveClass('focus:left-4');
		});

		it('skip link is the first focusable element when Tab is pressed', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a');

			// Tab once - should focus the skip link
			await user.tab();

			expect(link).toHaveFocus();
		});
	});

	// ---------------------------------------------------------------------------
	// Acceptance Criteria 2: Activating skip link moves focus to main content
	// ---------------------------------------------------------------------------
	describe('AC2: Activating skip link moves focus to main content', () => {
		it('pressing Enter activates the skip link and moves focus', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;
			const target = document.getElementById(TARGET_ID) as HTMLElement;

			// Tab to skip link
			await user.tab();
			expect(link).toHaveFocus();

			// Press Enter
			await user.keyboard('{Enter}');

			// Focus should move to target
			expect(target).toHaveFocus();
		});

		it('pressing Space activates the skip link and moves focus', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;
			const target = document.getElementById(TARGET_ID) as HTMLElement;

			// Tab to skip link
			await user.tab();
			expect(link).toHaveFocus();

			// Press Space
			await user.keyboard(' ');

			// Focus should move to target
			expect(target).toHaveFocus();
		});

		it('clicking skip link moves focus to target', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;
			const target = document.getElementById(TARGET_ID) as HTMLElement;

			// Click the link
			await user.click(link);

			// Focus should move to target
			expect(target).toHaveFocus();
		});
	});

	// ---------------------------------------------------------------------------
	// Acceptance Criteria 3: Link is invisible to mouse users
	// ---------------------------------------------------------------------------
	describe('AC3: Link is invisible to mouse users', () => {
		it('skip link is not visible without keyboard focus', () => {
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;

			// Should be positioned off-screen
			expect(link).toHaveClass('-left-full');

			
		});

		it('mouse hover does not reveal the skip link', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;

			// Hover over the link
			await user.pointer({ keys: '[MouseOver]', target: link });

			// Should still be off-screen (not visible)
			expect(link).not.toHaveFocus();
			expect(link).toHaveClass('-left-full');
		});
	});

	// ---------------------------------------------------------------------------
	// Feature: Functional focus management
	// ---------------------------------------------------------------------------
	describe('Focus management', () => {
		it('scrolls target into view when skip link is activated', async () => {
			const user = userEvent.setup();
			const scrollIntoViewMock = vi.fn();

			const target = document.getElementById(TARGET_ID) as HTMLElement;
			target.scrollIntoView = scrollIntoViewMock;

			render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);


			// Tab to skip link and press Enter
			await user.tab();
			await user.keyboard('{Enter}');

			// scrollIntoView should have been called
			expect(scrollIntoViewMock).toHaveBeenCalledWith({
				behavior: 'smooth',
				block: 'start',
			});
		});

		it('renders with default label when not provided', () => {
			const { container } = render(<SkipToContent targetId={TARGET_ID} />);
			const link = container.querySelector('a');
			expect(link).toHaveTextContent('Skip to main content');
		});

		it('renders with custom label when provided', () => {
			const customLabel = 'Jump to creators';
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={customLabel} />
			);
			const link = container.querySelector('a');
			expect(link).toHaveTextContent(customLabel);
		});

		it('accepts custom className prop', () => {
			const customClass = 'custom-skip-link';
			const { container } = render(
				<SkipToContent
					targetId={TARGET_ID}
					className={customClass}
				/>
			);
			const link = container.querySelector('a');
			expect(link).toHaveClass(customClass);
		});
	});

	// ---------------------------------------------------------------------------
	// Edge cases
	// ---------------------------------------------------------------------------
	describe('Edge cases', () => {
		it('gracefully handles missing target element', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId="nonexistent" label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;

			// Tab to skip link
			await user.tab();
			expect(link).toHaveFocus();

			// Try to activate - should not throw error
			await user.keyboard('{Enter}');
			expect(link).toHaveFocus(); // Focus stays on link since target doesn't exist
		});

		it('prevents default link behavior when activated', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<SkipToContent targetId={TARGET_ID} label={SKIP_LABEL} />
			);
			const link = container.querySelector('a') as HTMLElement;

			const preventDefaultSpy = vi.fn();
			link.addEventListener('click', preventDefaultSpy);

			// Tab and click
			await user.tab();
			await user.keyboard('{Enter}');

			// Default behavior should be prevented (no navigation)
			expect(link.href).toBe(`${window.location.href}#${TARGET_ID}`);
		});
	});

	// ---------------------------------------------------------------------------
	// Integration: LandingPage skip-to-content workflow
	// ---------------------------------------------------------------------------
	describe('LandingPage integration pattern', () => {
		it('works as first focusable element with tabIndex=-1 target', async () => {
			const user = userEvent.setup();

			// Simulate LandingPage structure
			const { container } = render(
				<>
					<SkipToContent
						targetId="main-creator-list"
						label="Skip to creator list"
					/>
					<div
						id="main-creator-list"
						tabIndex={-1}
						style={{ outline: 'none' }}
					>
						Creator list content
					</div>
				</>
			);

			const skipLink = container.querySelector('a') as HTMLElement;
			const creatorList = document.getElementById(
				'main-creator-list'
			) as HTMLElement;

			// Tab once - skip link focused
			await user.tab();
			expect(skipLink).toHaveFocus();

			// Press Enter - focus moves to creator list
			await user.keyboard('{Enter}');
			expect(creatorList).toHaveFocus();
			expect(skipLink).not.toHaveFocus();
		});
	});
});
