import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';

const PROFILE_URL = 'https://accesslayer.example/creators/arivers';

describe('CreatorProfileHeader', () => {
	beforeEach(() => {
		vi.stubGlobal('location', {
			...window.location,
			href: PROFILE_URL,
		});
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
		vi.stubGlobal('prompt', vi.fn());
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('renders a share button that copies the profile URL to the clipboard', async () => {
		render(
			<CreatorProfileHeader
				name="Alex Rivers"
				handle="arivers"
				creatorId="arivers"
				avatarUrl="https://example.com/avatar.png"
			/>
		);

		const shareButton = screen.getByRole('button', { name: /share profile/i });
		expect(shareButton).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(shareButton);
		});

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PROFILE_URL);
		expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
		expect(screen.getByText('Copied!')).toBeInTheDocument();
		expect(window.prompt).not.toHaveBeenCalled();
	});

	it('reverts from Copied! back to the share icon after 2 seconds', async () => {
		vi.useFakeTimers();

		render(
			<CreatorProfileHeader
				name="Alex Rivers"
				handle="arivers"
				creatorId="arivers"
			/>
		);

		const shareButton = screen.getByRole('button', { name: /share profile/i });

		await act(async () => {
			fireEvent.click(shareButton);
		});

		expect(screen.getByText('Copied!')).toBeInTheDocument();

		await act(async () => {
			vi.advanceTimersByTime(2000);
		});

		expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /share profile/i })
		).toBeInTheDocument();
	});

	it('falls back to window.prompt when the Clipboard API is unavailable', async () => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: undefined,
		});

		render(
			<CreatorProfileHeader
				name="Alex Rivers"
				handle="arivers"
				creatorId="arivers"
			/>
		);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /share profile/i }));
		});

		expect(window.prompt).toHaveBeenCalledWith(PROFILE_URL);
		expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
	});

	it('falls back to window.prompt when clipboard writeText rejects', async () => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: vi.fn().mockRejectedValue(new Error('denied')),
			},
		});

		render(
			<CreatorProfileHeader
				name="Alex Rivers"
				handle="arivers"
				creatorId="arivers"
			/>
		);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /share profile/i }));
		});

		expect(window.prompt).toHaveBeenCalledWith(PROFILE_URL);
	});
});
