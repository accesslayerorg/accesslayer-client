import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentGatePanel } from '../ContentGatePanel';
import {
	useContentGateConfig,
	useSetContentGateMutation,
} from '@/hooks/useContentGate';
import type { ContentGateConfig } from '@/types/contentGate';

vi.mock('@/hooks/useContentGate', () => ({
	useContentGateConfig: vi.fn(),
	useSetContentGateMutation: vi.fn(),
}));

const CREATOR_ID = 'key-1';

const mockMutate = vi.fn();

function mockConfig(
	config: Partial<ContentGateConfig> = {},
	isLoading = false,
	isError = false
) {
	vi.mocked(useContentGateConfig).mockReturnValue({
		config: { gateType: 'none', thresholdAmount: null, ...config },
		isLoading,
		isError,
		refetch: vi.fn(),
	});
}

describe('ContentGatePanel (#1221)', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockConfig();
		vi.mocked(useSetContentGateMutation).mockReturnValue({
			mutate: mockMutate,
			isPending: false,
		} as unknown as ReturnType<typeof useSetContentGateMutation>);
	});

	it('renders all four gate type options', () => {
		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		expect(screen.getByTestId('content-gate-option-none')).toBeInTheDocument();
		expect(
			screen.getByTestId('content-gate-option-holder')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('content-gate-option-subscriber')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('content-gate-option-threshold')
		).toBeInTheDocument();

		expect(screen.getByTestId('content-gate-option-none')).toHaveTextContent(
			'No Gate'
		);
		expect(
			screen.getByTestId('content-gate-option-holder')
		).toHaveTextContent('Holder Required');
		expect(
			screen.getByTestId('content-gate-option-subscriber')
		).toHaveTextContent('Subscriber Required');
		expect(
			screen.getByTestId('content-gate-option-threshold')
		).toHaveTextContent('Threshold (token amount)');
	});

	it('hides the threshold input until the threshold gate is selected', async () => {
		const user = userEvent.setup();
		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		expect(
			screen.queryByTestId('content-gate-threshold-input')
		).not.toBeInTheDocument();

		await user.click(screen.getByTestId('content-gate-option-threshold'));

		expect(
			screen.getByTestId('content-gate-threshold-input')
		).toBeInTheDocument();
	});

	it('hides the threshold input again when another gate type is selected', async () => {
		const user = userEvent.setup();
		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		await user.click(screen.getByTestId('content-gate-option-threshold'));
		expect(
			screen.getByTestId('content-gate-threshold-input')
		).toBeInTheDocument();

		await user.click(screen.getByTestId('content-gate-option-holder'));
		expect(
			screen.queryByTestId('content-gate-threshold-input')
		).not.toBeInTheDocument();
	});

	it('submits the selected gate with its threshold', async () => {
		const user = userEvent.setup();
		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		await user.click(screen.getByTestId('content-gate-option-threshold'));
		await user.type(screen.getByTestId('content-gate-threshold-input'), '250');
		await user.click(screen.getByTestId('content-gate-submit'));

		expect(mockMutate).toHaveBeenCalledWith({
			gateType: 'threshold',
			thresholdAmount: 250,
		});
	});

	it('submits a gate without a threshold for the other gate types', async () => {
		const user = userEvent.setup();
		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		await user.click(screen.getByTestId('content-gate-option-subscriber'));
		await user.click(screen.getByTestId('content-gate-submit'));

		expect(mockMutate).toHaveBeenCalledWith({
			gateType: 'subscriber',
			thresholdAmount: null,
		});
	});

	it('blocks the save when the threshold is missing', async () => {
		const user = userEvent.setup();
		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		await user.click(screen.getByTestId('content-gate-option-threshold'));
		await user.click(screen.getByTestId('content-gate-submit'));

		expect(mockMutate).not.toHaveBeenCalled();
		expect(
			screen.getByTestId('content-gate-threshold-error')
		).toBeInTheDocument();
	});

	it('opens on the stored configuration', () => {
		mockConfig({ gateType: 'threshold', thresholdAmount: 100 });

		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		expect(
			screen.getByTestId('content-gate-option-threshold')
		).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByTestId('content-gate-threshold-input')).toHaveValue(100);
		expect(screen.getByTestId('content-gate-current')).toHaveTextContent(
			'Threshold (token amount)'
		);
	});

	it('shows a loading skeleton while the configuration loads', () => {
		mockConfig({}, true);

		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		expect(screen.getByTestId('content-gate-loading')).toBeInTheDocument();
		expect(
			screen.queryByTestId('content-gate-type-selector')
		).not.toBeInTheDocument();
	});

	it('shows an error when the configuration cannot be loaded', () => {
		mockConfig({}, false, true);

		render(<ContentGatePanel creatorId={CREATOR_ID} />);

		expect(screen.getByTestId('content-gate-error')).toBeInTheDocument();
	});
});
