import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keyCommentsService } from '@/services/keyComments.service';
import { useKeyComments } from '../useKeyComments';

vi.mock('@/services/keyComments.service', () => ({
	keyCommentsService: {
		getCommentsPage: vi.fn(),
		createComment: vi.fn(),
		hideComment: vi.fn(),
	},
}));

const service = vi.mocked(keyCommentsService);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children
		);
	};
}

describe('useKeyComments', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		service.getCommentsPage.mockResolvedValue({
			comments: [],
			nextCursor: null,
		});
	});

	it('posts a top-level comment', async () => {
		const { result } = renderHook(() => useKeyComments('key-1'), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(async () => {
			await result.current.postComment({ content: 'Great key' });
		});

		expect(service.createComment).toHaveBeenCalledWith('key-1', {
			content: 'Great key',
		});
	});

	it('posts a reply with its parent comment id', async () => {
		const { result } = renderHook(() => useKeyComments('key-1'), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(async () => {
			await result.current.postComment({
				content: 'Agreed',
				parentId: 'parent-1',
			});
		});

		expect(service.createComment).toHaveBeenCalledWith('key-1', {
			content: 'Agreed',
			parentId: 'parent-1',
		});
	});

	it('hides a comment through the moderation endpoint', async () => {
		const { result } = renderHook(() => useKeyComments('key-1'), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(async () => {
			await result.current.hideComment('comment-1');
		});

		expect(service.hideComment).toHaveBeenCalledWith('comment-1');
	});

	it('loads the next page using its cursor', async () => {
		service.getCommentsPage
			.mockResolvedValueOnce({ comments: [], nextCursor: 'cursor-2' })
			.mockResolvedValueOnce({ comments: [], nextCursor: null });
		const { result } = renderHook(() => useKeyComments('key-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.hasNextPage).toBe(true));
		await act(async () => {
			await result.current.fetchNextPage();
		});
		expect(service.getCommentsPage).toHaveBeenNthCalledWith(
			2,
			'key-1',
			'cursor-2'
		);
	});
});
