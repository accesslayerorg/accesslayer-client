import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import {
	keySocialFeedService,
	type CreateFeedPostInput,
	type FeedPost,
} from '@/services/keySocialFeed.service';

export function useKeySocialFeed(keyId: string) {
	const queryClient = useQueryClient();
	const query = useInfiniteQuery({
		queryKey: queryKeys.creators.socialFeed(keyId),
		queryFn: ({ pageParam }) =>
			keySocialFeedService.getPostsPage(keyId, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		enabled: Boolean(keyId),
	});

	const posts = useMemo(() => {
		const seen = new Set<string>();
		const result: FeedPost[] = [];
		for (const page of query.data?.pages ?? []) {
			for (const post of page.posts) {
				if (seen.has(post.id)) continue;
				seen.add(post.id);
				result.push(post);
			}
		}
		return result;
	}, [query.data]);

	const invalidateFeed = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.creators.socialFeed(keyId),
		});

	const postMutation = useMutation({
		mutationFn: (input: CreateFeedPostInput) =>
			keySocialFeedService.createPost(keyId, input),
		onSuccess: invalidateFeed,
	});
	const hideMutation = useMutation({
		mutationFn: (postId: string) =>
			keySocialFeedService.hidePost(postId),
		onSuccess: invalidateFeed,
	});

	return {
		posts,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		fetchNextPage: query.fetchNextPage,
		createPost: postMutation.mutateAsync,
		isCreating: postMutation.isPending,
		hidePost: hideMutation.mutateAsync,
		isHiding: hideMutation.isPending,
	};
}
