import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommentSection from '@/components/common/CommentSection';
import { useKeyComments } from '@/hooks/useKeyComments';

const mockUseAccount = vi.fn();
const mockUseConnect = vi.fn();

vi.mock('wagmi', () => ({
	useAccount: () => mockUseAccount(),
	useConnect: () => mockUseConnect(),
}));

vi.mock('@/hooks/useKeyComments', () => ({
	useKeyComments: vi.fn(),
}));

const mockUseKeyComments = vi.mocked(useKeyComments);
const topLevelComment = {
	id: 'comment-1',
	keyId: 'key-1',
	authorAddress: 'GABCDEF1234567890',
	authorName: 'Holder One',
	content: 'A top-level comment',
	createdAt: '2026-01-01T00:00:00.000Z',
	authorKeyBalance: 1,
};

function mockComments(
	overrides: Partial<ReturnType<typeof useKeyComments>> = {}
) {
	mockUseKeyComments.mockReturnValue({
		comments: [topLevelComment],
		hasNextPage: false,
		isFetchingNextPage: false,
		isLoading: false,
		isError: false,
		error: null,
		fetchNextPage: vi.fn(),
		postComment: vi.fn().mockResolvedValue({}),
		isPosting: false,
		hideComment: vi.fn().mockResolvedValue({}),
		isHiding: false,
		...overrides,
	} as ReturnType<typeof useKeyComments>);
}

describe('CommentSection', () => {
	beforeEach(() => {
		mockUseAccount.mockReturnValue({ isConnected: true, address: 'GVIEWER' });
		mockUseConnect.mockReturnValue({
			connect: vi.fn(),
			connectors: [{ id: 'wallet' }],
			isPending: false,
		});
		mockComments();
	});

	it('posts a comment for a connected wallet', async () => {
		const postComment = vi.fn().mockResolvedValue(undefined);
		mockComments({ postComment });
		render(<CommentSection keyId="key-1" creatorAddress="GCREATOR" />);

		fireEvent.change(screen.getByLabelText('Comment'), {
			target: { value: 'My comment' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));

		await waitFor(() =>
			expect(postComment).toHaveBeenCalledWith({ content: 'My comment' })
		);
	});

	it('posts a reply under its parent', async () => {
		const postComment = vi.fn().mockResolvedValue(undefined);
		mockComments({ postComment });
		render(<CommentSection keyId="key-1" creatorAddress="GCREATOR" />);

		fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
		fireEvent.change(screen.getAllByLabelText('Comment')[1], {
			target: { value: 'A reply' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Post reply' }));

		await waitFor(() =>
			expect(postComment).toHaveBeenCalledWith({
				content: 'A reply',
				parentId: 'comment-1',
			})
		);
	});

	it('allows the creator to hide a comment', async () => {
		const hideComment = vi.fn().mockResolvedValue(undefined);
		mockComments({ hideComment });
		mockUseAccount.mockReturnValue({ isConnected: true, address: 'gcreator' });
		render(<CommentSection keyId="key-1" creatorAddress="GCREATOR" />);

		fireEvent.click(screen.getByRole('button', { name: 'Hide comment' }));
		await waitFor(() => expect(hideComment).toHaveBeenCalledWith('comment-1'));
	});

	it('shows the Holder badge only when the author has a positive balance', () => {
		const { rerender } = render(
			<CommentSection keyId="key-1" creatorAddress="GCREATOR" />
		);
		expect(screen.getByTestId('comment-holder-badge')).toHaveTextContent(
			'Holder'
		);

		mockComments({
			comments: [{ ...topLevelComment, authorKeyBalance: 0 }],
		});
		rerender(<CommentSection keyId="key-1" creatorAddress="GCREATOR" />);
		expect(screen.queryByTestId('comment-holder-badge')).not.toBeInTheDocument();
	});

	it('nests replies and supports collapsing them', () => {
		mockComments({
			comments: [
				topLevelComment,
				{
					...topLevelComment,
					id: 'reply-1',
					parentId: 'comment-1',
					content: 'Nested reply',
					authorKeyBalance: 0,
				},
			],
		});
		render(<CommentSection keyId="key-1" creatorAddress="GCREATOR" />);

		expect(screen.getByText('Nested reply')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Hide 1 reply' }));
		expect(screen.queryByText('Nested reply')).not.toBeInTheDocument();
	});

	it('shows a connect prompt instead of the composer when disconnected', () => {
		mockUseAccount.mockReturnValue({ isConnected: false, address: undefined });
		render(<CommentSection keyId="key-1" creatorAddress="GCREATOR" />);

		expect(screen.getByText(/Connect your wallet to join/)).toBeInTheDocument();
		expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument();
	});

	it('enforces the 500 character comment limit', () => {
		render(<CommentSection keyId="key-1" creatorAddress="GCREATOR" />);
		const input = screen.getByLabelText('Comment') as HTMLTextAreaElement;
		expect(input).toHaveAttribute('maxLength', '500');
	});
});
