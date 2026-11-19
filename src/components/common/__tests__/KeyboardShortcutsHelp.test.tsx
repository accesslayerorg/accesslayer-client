import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyboardShortcutsHelp from '@/components/common/KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
	it('renders when open', () => {
		render(<KeyboardShortcutsHelp open onOpenChange={vi.fn()} />);

		expect(screen.getByTestId('keyboard-shortcuts-help')).toBeInTheDocument();
	});

	it('does not render when closed', () => {
		render(<KeyboardShortcutsHelp open={false} onOpenChange={vi.fn()} />);

		expect(
			screen.queryByTestId('keyboard-shortcuts-help')
		).not.toBeInTheDocument();
	});

	it('displays all shortcut categories', () => {
		render(<KeyboardShortcutsHelp open onOpenChange={vi.fn()} />);

		expect(screen.getByText('Trade')).toBeInTheDocument();
		expect(screen.getByText('Navigation')).toBeInTheDocument();
		expect(screen.getByText('Amount')).toBeInTheDocument();
		expect(screen.getByText('Quick amount')).toBeInTheDocument();
	});

	it('displays trade shortcut descriptions', () => {
		render(<KeyboardShortcutsHelp open onOpenChange={vi.fn()} />);

		expect(screen.getByText('Open buy dialog')).toBeInTheDocument();
		expect(screen.getByText('Open sell dialog')).toBeInTheDocument();
		expect(screen.getByText('Confirm trade (when valid)')).toBeInTheDocument();
	});

	it('displays navigation shortcut descriptions', () => {
		render(<KeyboardShortcutsHelp open onOpenChange={vi.fn()} />);

	expect(screen.getByText('Navigate to portfolio')).toBeInTheDocument();
	expect(screen.getByText('Focus search bar')).toBeInTheDocument();
	expect(screen.getByText('Switch to Overview tab')).toBeInTheDocument();
		expect(screen.getByText('Switch to Creations tab')).toBeInTheDocument();
		expect(screen.getByText('Switch to Collectors tab')).toBeInTheDocument();
		expect(screen.getByText('Switch to Activity tab')).toBeInTheDocument();
		expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
	});

	it('displays keyboard key labels', () => {
		render(<KeyboardShortcutsHelp open onOpenChange={vi.fn()} />);

		// Check for key labels (kbd elements)
		expect(screen.getAllByText('B').length).toBeGreaterThan(0);
		expect(screen.getAllByText('S').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Enter').length).toBeGreaterThan(0);
		expect(screen.getAllByText('/').length).toBeGreaterThan(0);
	});
});
