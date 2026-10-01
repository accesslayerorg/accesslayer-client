import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import GlobalSearch from '../GlobalSearch';
import { searchService, type GlobalSearchResults } from '@/services/search.service';
import { BrowserRouter } from 'react-router';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

vi.mock('@/services/search.service', () => ({
	searchService: {
		search: vi.fn(),
	},
}));

describe('GlobalSearch (#933)', () => {
	const mockResults: GlobalSearchResults = {
		keys: [
			{
				id: 'key-1',
				title: 'Alpha Key',
				priceStroops: 25000000,
				creatorId: 'creator-alpha',
				category: 'Tech',
				change24h: 5.2,
			},
		],
		creators: [
			{
				id: 'creator-1',
				name: 'Alice Creator',
				socialHandle: 'alice_creator',
				isVerified: true,
			},
		],
		proposals: [
			{
				id: 'proposal-1',
				title: 'Proposal: Increase Quorum',
				description: 'A proposal to improve governance participation.',
				status: 'active',
			},
		],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('Cmd+K opens search input and focuses it', () => {
		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		expect(document.activeElement).not.toBe(input);

		// Trigger Cmd+K
		fireEvent.keyDown(window, { key: 'k', metaKey: true });
		expect(document.activeElement).toBe(input);

		input.blur();

		// Trigger Ctrl+K
		fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
		expect(document.activeElement).toBe(input);
	});

	it('debounce prevents excess API calls during typing (300ms debounce)', async () => {
		vi.mocked(searchService.search).mockResolvedValue(mockResults);

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'alp' } });

		// Should not be called immediately
		expect(searchService.search).not.toHaveBeenCalled();

		// Advance timer by 200ms (less than 300ms debounce)
		act(() => {
			vi.advanceTimersByTime(200);
		});
		expect(searchService.search).not.toHaveBeenCalled();

		// Advance timer by another 100ms (total 300ms)
		await act(async () => {
			vi.advanceTimersByTime(100);
		});

		expect(searchService.search).toHaveBeenCalledTimes(1);
		expect(searchService.search).toHaveBeenCalledWith('alp');
	});

	it('shows loading skeleton while query is fetching', async () => {
		let resolveSearch: (data: GlobalSearchResults) => void = () => {};
		const searchPromise = new Promise<GlobalSearchResults>(resolve => {
			resolveSearch = resolve;
		});
		vi.mocked(searchService.search).mockReturnValue(searchPromise);

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'loading test' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		// Loading skeleton should be visible in dropdown
		expect(screen.getByTestId('global-search-dropdown')).toBeInTheDocument();
		expect(screen.getByTestId('global-search-loading')).toBeInTheDocument();

		// Resolve search
		await act(async () => {
			resolveSearch(mockResults);
		});

		// Loading skeleton is gone, results are rendered
		expect(screen.queryByTestId('global-search-loading')).not.toBeInTheDocument();
		expect(screen.getByTestId('global-search-group-keys')).toBeInTheDocument();
	});

	it('results grouped correctly by type in dropdown (Keys, Creators, Proposals)', async () => {
		vi.mocked(searchService.search).mockResolvedValue(mockResults);

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'Alpha' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('global-search-dropdown')).toBeInTheDocument();
		});

		// Verify Keys group
		expect(screen.getByTestId('global-search-group-keys')).toBeInTheDocument();
		expect(screen.getByText('Alpha Key')).toBeInTheDocument();

		// Verify Creators group
		expect(screen.getByTestId('global-search-group-creators')).toBeInTheDocument();
		expect(screen.getByText('Alice Creator')).toBeInTheDocument();
		expect(screen.getByText('@alice_creator')).toBeInTheDocument();

		// Verify Proposals group
		expect(screen.getByTestId('global-search-group-proposals')).toBeInTheDocument();
		expect(screen.getByText('Proposal: Increase Quorum')).toBeInTheDocument();
		expect(screen.getByText('active')).toBeInTheDocument();
	});

	it('clicking a key result navigates to the correct detail page', async () => {
		vi.mocked(searchService.search).mockResolvedValue(mockResults);

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'Alpha' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('global-search-item-key')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('global-search-item-key'));

		expect(mockNavigate).toHaveBeenCalledWith('/creator/creator-alpha');
		expect(screen.queryByTestId('global-search-dropdown')).not.toBeInTheDocument();
		expect(input).toHaveValue('');
	});

	it('clicking a creator result navigates to the creator profile page', async () => {
		vi.mocked(searchService.search).mockResolvedValue(mockResults);

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'Alice' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('global-search-item-creator')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('global-search-item-creator'));

		expect(mockNavigate).toHaveBeenCalledWith('/creator/creator-1');
		expect(screen.queryByTestId('global-search-dropdown')).not.toBeInTheDocument();
		expect(input).toHaveValue('');
	});

	it('clicking a proposal result navigates to the governance proposal', async () => {
		vi.mocked(searchService.search).mockResolvedValue(mockResults);

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'Proposal' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('global-search-item-proposal')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('global-search-item-proposal'));

		expect(mockNavigate).toHaveBeenCalledWith('/governance?proposal=proposal-1');
		expect(screen.queryByTestId('global-search-dropdown')).not.toBeInTheDocument();
		expect(input).toHaveValue('');
	});

	it('empty state shown when no results match the query', async () => {
		vi.mocked(searchService.search).mockResolvedValue({
			keys: [],
			creators: [],
			proposals: [],
		});

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'xyzunknown' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('global-search-empty')).toBeInTheDocument();
		});

		expect(screen.getByText('No results found')).toBeInTheDocument();
		expect(
			screen.getByText(/No keys, creators, or proposals matching/i)
		).toBeInTheDocument();
	});

	it('clears dropdown and resets input on Escape key', async () => {
		vi.mocked(searchService.search).mockResolvedValue(mockResults);

		render(
			<BrowserRouter>
				<GlobalSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'Alpha' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('global-search-dropdown')).toBeInTheDocument();
		});

		fireEvent.keyDown(input, { key: 'Escape' });

		expect(input).toHaveValue('');
		expect(screen.queryByTestId('global-search-dropdown')).not.toBeInTheDocument();
	});

	it('closes dropdown on click outside', async () => {
		vi.mocked(searchService.search).mockResolvedValue(mockResults);

		render(
			<BrowserRouter>
				<div>
					<GlobalSearch />
					<div data-testid="outside-area">Outside</div>
				</div>
			</BrowserRouter>
		);

		const input = screen.getByTestId('global-search-input');
		fireEvent.change(input, { target: { value: 'Alpha' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('global-search-dropdown')).toBeInTheDocument();
		});

		fireEvent.mouseDown(screen.getByTestId('outside-area'));

		expect(screen.queryByTestId('global-search-dropdown')).not.toBeInTheDocument();
	});
});
