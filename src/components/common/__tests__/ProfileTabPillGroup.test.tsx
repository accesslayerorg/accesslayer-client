import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';

// ---------------------------------------------------------------------------
// Feature: creator-profile-anchor-links (#159)
// Validates: URL hash navigation, hashchange listener, tab ↔ panel wiring
// ---------------------------------------------------------------------------

const TABS = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Creations', value: 'creations' },
	{ label: 'Collectors', value: 'collectors' },
	{ label: 'Activity', value: 'activity' },
];

describe('ProfileTabPillGroup – hash routing disabled (default)', () => {
	beforeEach(() => {
		window.location.hash = '';
	});

	it('does not update the URL hash when a tab is clicked', () => {
		const onTabChange = vi.fn();
		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="overview"
				onTabChange={onTabChange}
			/>
		);

		fireEvent.click(screen.getByRole('tab', { name: 'Creations' }));

		expect(onTabChange).toHaveBeenCalledWith('creations');
		expect(window.location.hash).toBe('');
	});
});

describe('ProfileTabPillGroup – hash routing enabled', () => {
	beforeEach(() => {
		// Reset hash before each test
		window.location.hash = '';
	});

	it('sets the URL hash when a tab is clicked', () => {
		const onTabChange = vi.fn();
		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="overview"
				onTabChange={onTabChange}
				enableHashRouting
			/>
		);

		fireEvent.click(screen.getByRole('tab', { name: 'Collectors' }));

		expect(onTabChange).toHaveBeenCalledWith('collectors');
		expect(window.location.hash).toBe('#collectors');
	});

	it('reads the initial URL hash and activates the matching tab on mount', () => {
		window.location.hash = '#activity';
		const onTabChange = vi.fn();

		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="overview"
				onTabChange={onTabChange}
				enableHashRouting
			/>
		);

		// The component should call onTabChange with the hash value on mount
		expect(onTabChange).toHaveBeenCalledWith('activity');
	});

	it('does not call onTabChange when the hash matches the active tab', () => {
		window.location.hash = '#overview';
		const onTabChange = vi.fn();

		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="overview"
				onTabChange={onTabChange}
				enableHashRouting
			/>
		);

		expect(onTabChange).not.toHaveBeenCalled();
	});

	it('ignores a URL hash that does not match any tab value', () => {
		window.location.hash = '#unknown-section';
		const onTabChange = vi.fn();

		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="overview"
				onTabChange={onTabChange}
				enableHashRouting
			/>
		);

		expect(onTabChange).not.toHaveBeenCalled();
	});

	it('responds to a hashchange event after mount', () => {
		const onTabChange = vi.fn();
		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="overview"
				onTabChange={onTabChange}
				enableHashRouting
			/>
		);

		// Simulate the browser navigating to #creations (e.g. via back/forward)
		window.location.hash = '#creations';
		fireEvent(window, new HashChangeEvent('hashchange'));

		expect(onTabChange).toHaveBeenCalledWith('creations');
	});

	it('renders each tab with an id and aria-controls pointing to its panel', () => {
		const onTabChange = vi.fn();
		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="overview"
				onTabChange={onTabChange}
				enableHashRouting
			/>
		);

		for (const tab of TABS) {
			const button = screen.getByRole('tab', { name: tab.label });
			expect(button).toHaveAttribute('id', `profile-tab-${tab.value}`);
			expect(button).toHaveAttribute(
				'aria-controls',
				`profile-panel-${tab.value}`
			);
		}
	});

	it('marks only the active tab as selected', () => {
		const onTabChange = vi.fn();
		render(
			<ProfileTabPillGroup
				tabs={TABS}
				activeTab="creations"
				onTabChange={onTabChange}
				enableHashRouting
			/>
		);

		expect(screen.getByRole('tab', { name: 'Creations' })).toHaveAttribute(
			'aria-selected',
			'true'
		);

		for (const tab of TABS.filter(t => t.value !== 'creations')) {
			expect(screen.getByRole('tab', { name: tab.label })).toHaveAttribute(
				'aria-selected',
				'false'
			);
		}
	});
});
