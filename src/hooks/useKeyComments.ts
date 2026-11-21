import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import {
	keyCommentsService,
	type CreateKeyCommentInput,
	type KeyComment,
} from '@/services/keyComments.service';

export function useKeyComments(keyId: string) {
	const queryClient = useQueryClient();
	const query = useInfiniteQuery({
		queryKey: queryKeys.creators.comments(keyId),
		queryFn: ({ pageParam }) =>
			keyCommentsService.getCommentsPage(keyId, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		enabled: Boolean(keyId),
	});

	const comments = useMemo(() => {
		const seen = new Set<string>();
		const result: KeyComment[] = [];
		for (const page of query.data?.pages ?? []) {
			for (const comment of page.comments) {
				if (seen.has(comment.id)) continue;
				seen.add(comment.id);
				result.push(comment);
			}
		}
		return result;
	}, [query.data]);

	const invalidateComments = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.creators.comments(keyId),
		});

	const postMutation = useMutation({
		mutationFn: (input: CreateKeyCommentInput) =>
			keyCommentsService.createComment(keyId, input),
		onSuccess: invalidateComments,
	});
	const hideMutation = useMutation({
		mutationFn: (commentId: string) =>
			keyCommentsService.hideComment(commentId),
		onSuccess: invalidateComments,
	});

	return {
		comments,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		fetchNextPage: query.fetchNextPage,
		postComment: postMutation.mutateAsync,
		isPosting: postMutation.isPending,
		hideComment: hideMutation.mutateAsync,
		isHiding: hideMutation.isPending,
	};
}
