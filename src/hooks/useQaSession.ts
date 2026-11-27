import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface QaSession {
	id: string;
	creatorId: string;
	title: string;
	startTime: string;
	durationMinutes: number;
	holderRequirement: number;
	status: 'upcoming' | 'live' | 'ended';
}

export interface QaQuestion {
	id: string;
	sessionId: string;
	authorWallet: string;
	text: string;
	votes: number;
	answered: boolean;
	answerText: string | null;
	createdAt: string;
}

export interface AskQuestionInput {
	text: string;
}

export interface AnswerQuestionInput {
	questionId: string;
	answerText: string;
}

const QA_STORAGE_PREFIX = 'accesslayer:qa:';

function sessionKey(sessionId: string) {
	return `${QA_STORAGE_PREFIX}session:${sessionId}`;
}
function questionsKey(sessionId: string) {
	return `${QA_STORAGE_PREFIX}questions:${sessionId}`;
}
function votesKey(sessionId: string, wallet: string) {
	return `${QA_STORAGE_PREFIX}votes:${sessionId}:${wallet}`;
}

function readSession(sessionId: string): QaSession | null {
	try {
		const raw = localStorage.getItem(sessionKey(sessionId));
		return raw ? (JSON.parse(raw) as QaSession) : null;
	} catch {
		return null;
	}
}

function readQuestions(sessionId: string): QaQuestion[] {
	try {
		const raw = localStorage.getItem(questionsKey(sessionId));
		return raw ? (JSON.parse(raw) as QaQuestion[]) : [];
	} catch {
		return [];
	}
}

function writeQuestions(sessionId: string, questions: QaQuestion[]) {
	try {
		localStorage.setItem(questionsKey(sessionId), JSON.stringify(questions));
	} catch {
		// Storage unavailable — silent degradation.
	}
}

function readVotes(sessionId: string, wallet: string): Set<string> {
	try {
		const raw = localStorage.getItem(votesKey(sessionId, wallet));
		return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
	} catch {
		return new Set();
	}
}

function writeVotes(sessionId: string, wallet: string, votes: Set<string>) {
	try {
		localStorage.setItem(votesKey(sessionId, wallet), JSON.stringify([...votes]));
	} catch {
		// Storage unavailable — silent degradation.
	}
}

function qaQueryKey(sessionId: string) {
	return ['qa-session', sessionId] as const;
}
function qaQuestionsQueryKey(sessionId: string) {
	return ['qa-session', sessionId, 'questions'] as const;
}
function qaVotesQueryKey(sessionId: string, wallet: string) {
	return ['qa-session', sessionId, 'votes', wallet] as const;
}

/**
 * Hook for scheduled holder Q&A sessions (#1453).
 *
 * Provides session metadata, sorted question list, upvote and ask mutations,
 * and an answer mutation restricted to the session creator. Polls every 15s
 * during live sessions so votes and new questions appear without a page reload.
 */
export function useQaSession(sessionId: string, wallet?: string) {
	const queryClient = useQueryClient();

	// Derive live status from start time + duration to keep the demo self-contained.
	function deriveStatus(session: QaSession): QaSession['status'] {
		const start = new Date(session.startTime).getTime();
		const end = start + session.durationMinutes * 60_000;
		const now = Date.now();
		if (now < start) return 'upcoming';
		if (now >= start && now < end) return 'live';
		return 'ended';
	}

	const sessionQuery = useQuery({
		queryKey: qaQueryKey(sessionId),
		queryFn: () => {
			const s = readSession(sessionId);
			if (!s) return null;
			return { ...s, status: deriveStatus(s) };
		},
		enabled: !!sessionId,
		staleTime: 15_000,
		refetchInterval: (query) => {
			const session = query.state.data;
			return session?.status === 'live' ? 15_000 : false;
		},
	});

	const questionsQuery = useQuery({
		queryKey: qaQuestionsQueryKey(sessionId),
		queryFn: () => readQuestions(sessionId),
		enabled: !!sessionId,
		staleTime: 15_000,
		refetchInterval: sessionQuery.data?.status === 'live' ? 15_000 : false,
	});

	const votesQuery = useQuery({
		queryKey: wallet ? qaVotesQueryKey(sessionId, wallet) : ['qa-votes-none'],
		queryFn: () => (wallet ? readVotes(sessionId, wallet) : new Set<string>()),
		enabled: !!sessionId && !!wallet,
	});

	const session = sessionQuery.data ?? null;
	const questions = questionsQuery.data ?? [];
	const myVotes = votesQuery.data ?? new Set<string>();

	const sortedQuestions = [...questions]
		.filter(q => !q.answered)
		.sort((a, b) => b.votes - a.votes);

	const answeredQuestions = [...questions]
		.filter(q => q.answered)
		.sort((a, b) => b.votes - a.votes);

	const askMutation = useMutation({
		mutationFn: async (input: AskQuestionInput) => {
			if (!wallet) throw new Error('Wallet not connected');
			const existing = readQuestions(sessionId);
			// One open (unanswered) question per holder.
			const hasOpen = existing.some(
				q => q.authorWallet === wallet && !q.answered
			);
			if (hasOpen) throw new Error('You already have an open question.');
			if (input.text.length > 200) throw new Error('Question too long (max 200 chars).');

			const question: QaQuestion = {
				id: `${Date.now()}`,
				sessionId,
				authorWallet: wallet,
				text: input.text.trim(),
				votes: 0,
				answered: false,
				answerText: null,
				createdAt: new Date().toISOString(),
			};
			const updated = [...existing, question];
			writeQuestions(sessionId, updated);
			return updated;
		},
		onSuccess: data => queryClient.setQueryData(qaQuestionsQueryKey(sessionId), data),
	});

	const voteMutation = useMutation({
		mutationFn: async (questionId: string) => {
			if (!wallet) throw new Error('Wallet not connected');
			const votes = readVotes(sessionId, wallet);
			if (votes.has(questionId)) throw new Error('Already voted on this question.');
			votes.add(questionId);
			writeVotes(sessionId, wallet, votes);

			const existing = readQuestions(sessionId);
			const updated = existing.map(q =>
				q.id === questionId ? { ...q, votes: q.votes + 1 } : q
			);
			writeQuestions(sessionId, updated);
			queryClient.setQueryData(qaQuestionsQueryKey(sessionId), updated);
			return votes;
		},
		onSuccess: data => {
			if (wallet) queryClient.setQueryData(qaVotesQueryKey(sessionId, wallet), data);
		},
	});

	const answerMutation = useMutation({
		mutationFn: async ({ questionId, answerText }: AnswerQuestionInput) => {
			const existing = readQuestions(sessionId);
			const updated = existing.map(q =>
				q.id === questionId
					? { ...q, answered: true, answerText: answerText.trim() }
					: q
			);
			writeQuestions(sessionId, updated);
			return updated;
		},
		onSuccess: data => queryClient.setQueryData(qaQuestionsQueryKey(sessionId), data),
	});

	const hasVoted = useCallback(
		(questionId: string) => myVotes.has(questionId),
		[myVotes]
	);

	const hasOpenQuestion = questions.some(
		q => wallet && q.authorWallet === wallet && !q.answered
	);

	return {
		session,
		isLoadingSession: sessionQuery.isLoading,
		questions: sortedQuestions,
		answeredQuestions,
		isLoadingQuestions: questionsQuery.isLoading,
		hasVoted,
		hasOpenQuestion,
		askQuestion: (input: AskQuestionInput) => askMutation.mutate(input),
		voteOnQuestion: (id: string) => voteMutation.mutate(id),
		answerQuestion: (input: AnswerQuestionInput) => answerMutation.mutate(input),
		isAsking: askMutation.isPending,
		isVoting: voteMutation.isPending,
		isAnswering: answerMutation.isPending,
		askError: askMutation.error?.message ?? null,
	};
}
