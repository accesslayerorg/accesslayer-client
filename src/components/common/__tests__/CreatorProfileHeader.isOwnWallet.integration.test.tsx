import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';

const CREATOR_ADDRESS = '0xCreator1111111111111111111111111111111111';
const OTHER_ADDRESS = '0xOther22222222222222222222222222222222222';

const BASE_PROPS = {
	name: 'Alex Rivers',
	handle: 'arivers',
	creatorId: CREATOR_ADDRESS,
	avatarUrl: 'https://example.com/avatar.png',
};

describe('CreatorProfileHeader – isOwnWallet edit-controls visibility', () => {
	it('hides edit controls when the connected wallet does not match the creator', () => {
		const { container } = render(
			<CreatorProfileHeader
				{...BASE_PROPS}
				connectedWalletAddress={OTHER_ADDRESS}
			/>
		);

		expect(screen.queryByRole('button', { name: /edit bio/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /change avatar/i })).not.toBeInTheDocument();

		// Confirm the controls are truly absent from the DOM, not just hidden
		expect(container.querySelector('[aria-label="Edit bio"]')).toBeNull();
		expect(container.querySelector('[aria-label="Change avatar"]')).toBeNull();
	});

	it('shows edit controls when the connected wallet matches the creator', () => {
		render(
			<CreatorProfileHeader
				{...BASE_PROPS}
				connectedWalletAddress={CREATOR_ADDRESS}
			/>
		);

		expect(screen.getByRole('button', { name: /edit bio/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /change avatar/i })).toBeInTheDocument();
	});

	it('matches case-insensitively so mixed-case addresses are treated as the same wallet', () => {
		render(
			<CreatorProfileHeader
				{...BASE_PROPS}
				connectedWalletAddress={CREATOR_ADDRESS.toLowerCase()}
			/>
		);

		expect(screen.getByRole('button', { name: /edit bio/i })).toBeInTheDocument();
	});

	it('toggles edit controls when the connected wallet changes', () => {
		const { rerender } = render(
			<CreatorProfileHeader
				{...BASE_PROPS}
				connectedWalletAddress={OTHER_ADDRESS}
			/>
		);

		expect(screen.queryByRole('button', { name: /edit bio/i })).not.toBeInTheDocument();

		rerender(
			<CreatorProfileHeader
				{...BASE_PROPS}
				connectedWalletAddress={CREATOR_ADDRESS}
			/>
		);

		expect(screen.getByRole('button', { name: /edit bio/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /change avatar/i })).toBeInTheDocument();
	});

	it('hides edit controls when no wallet is connected', () => {
		render(
			<CreatorProfileHeader
				{...BASE_PROPS}
				connectedWalletAddress={null}
			/>
		);

		expect(screen.queryByRole('button', { name: /edit bio/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /change avatar/i })).not.toBeInTheDocument();
	});
});
