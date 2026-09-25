import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import MarketplaceHeaderSearch from '../MarketplaceHeaderSearch';
import { highlightMatchingSubstring } from '@/utils/substringHighlight.utils';
import { courseService } from '@/services/course.service';
import { BrowserRouter } from 'react-router';

vi.mock('@/services/course.service', () => ({
	courseService: {
		searchKeys: vi.fn(),
	},
}));

describe('MarketplaceHeaderSearch', () => {
	const mockCreators = [
		{
			id: 'creator-1',
			title: 'Alice Wonder',
			socialHandle: 'alicewonder',
			description: 'Test creator 1',
			price: 10,
			instructorId: 'inst-1',
			category: 'Tech',
			level: 'BEGINNER' as const,
		},
		{
			id: 'creator-2',
			title: 'Bob Builder',
			socialHandle: 'bobbuilder',
			description: 'Test creator 2',
			price: 20,
			instructorId: 'inst-2',
			category: 'Design',
			level: 'INTERMEDIATE' as const,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('fires search query only after 300ms debounce', async () => {
		vi.mocked(courseService.searchKeys).mockResolvedValue(mockCreators);

		render(
			<BrowserRouter>
				<MarketplaceHeaderSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('marketplace-search-input');
		fireEvent.change(input, { target: { value: 'Ali' } });

		// Should not have been called immediately
		expect(courseService.searchKeys).not.toHaveBeenCalled();

		// Advance timer by 200ms (less than 300ms)
		act(() => {
			vi.advanceTimersByTime(200);
		});
		expect(courseService.searchKeys).not.toHaveBeenCalled();

		// Advance timer by another 100ms (total 300ms)
		await act(async () => {
			vi.advanceTimersByTime(100);
		});

		expect(courseService.searchKeys).toHaveBeenCalledWith('Ali');
	});

	it('renders dropdown with correct results', async () => {
		vi.mocked(courseService.searchKeys).mockResolvedValue(mockCreators);

		render(
			<BrowserRouter>
				<MarketplaceHeaderSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('marketplace-search-input');
		fireEvent.change(input, { target: { value: 'Alice' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('marketplace-search-dropdown')).toBeInTheDocument();
		});

		const items = screen.getAllByTestId('marketplace-search-item');
		expect(items).toHaveLength(2);
		expect(items[0]).toHaveTextContent('Alice Wonder');
		expect(items[1]).toHaveTextContent('Bob Builder');
	});

	it('highlightMatchingSubstring bolds matching substring', () => {
		const { container } = render(<>{highlightMatchingSubstring('Alice Wonder', 'lic')}</>);
		const boldElement = container.querySelector('b');
		expect(boldElement).toBeInTheDocument();
		expect(boldElement).toHaveTextContent('lic');
		expect(boldElement).toHaveClass('font-bold');
	});

	it('clears dropdown and resets input on Escape key', async () => {
		vi.mocked(courseService.searchKeys).mockResolvedValue(mockCreators);

		render(
			<BrowserRouter>
				<MarketplaceHeaderSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('marketplace-search-input');
		fireEvent.change(input, { target: { value: 'Alice' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('marketplace-search-dropdown')).toBeInTheDocument();
		});

		fireEvent.keyDown(input, { key: 'Escape' });

		expect(input).toHaveValue('');
		expect(screen.queryByTestId('marketplace-search-dropdown')).not.toBeInTheDocument();
	});

	it('closes dropdown on click outside', async () => {
		vi.mocked(courseService.searchKeys).mockResolvedValue(mockCreators);

		render(
			<BrowserRouter>
				<div>
					<MarketplaceHeaderSearch />
					<div data-testid="outside-element">Outside</div>
				</div>
			</BrowserRouter>
		);

		const input = screen.getByTestId('marketplace-search-input');
		fireEvent.change(input, { target: { value: 'Alice' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		await waitFor(() => {
			expect(screen.getByTestId('marketplace-search-dropdown')).toBeInTheDocument();
		});

		fireEvent.mouseDown(screen.getByTestId('outside-element'));

		expect(screen.queryByTestId('marketplace-search-dropdown')).not.toBeInTheDocument();
	});

	it('clears results without a network call when query is empty', async () => {
		render(
			<BrowserRouter>
				<MarketplaceHeaderSearch />
			</BrowserRouter>
		);

		const input = screen.getByTestId('marketplace-search-input');
		fireEvent.change(input, { target: { value: '   ' } });

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(courseService.searchKeys).not.toHaveBeenCalled();
		expect(screen.queryByTestId('marketplace-search-dropdown')).not.toBeInTheDocument();
	});
});
