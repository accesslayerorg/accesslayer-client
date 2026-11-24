// #1452: Creator roadmap timeline with milestones and holder reactions
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type MilestoneStatus = 'planned' | 'in_progress' | 'done' | 'delayed';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: MilestoneStatus;
  revisedDate?: string;
  delayReason?: string;
  reactions: Record<string, string>; // walletAddress -> emoji
  order: number;
}

const ROADMAP_KEY = (keyId: string) => ['roadmap', keyId];

export function useRoadmap(keyId: string) {
  const qc = useQueryClient();

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ROADMAP_KEY(keyId),
    queryFn: async () => {
      const raw = localStorage.getItem(`roadmap_${keyId}`);
      return raw ? JSON.parse(raw) : [];
    },
  });

  const persist = (ms: Milestone[]) => {
    localStorage.setItem(`roadmap_${keyId}`, JSON.stringify(ms));
    qc.setQueryData(ROADMAP_KEY(keyId), ms);
  };

  const create = useMutation({
    mutationFn: async (m: Omit<Milestone, 'id' | 'reactions' | 'order'>) => {
      const next = [...milestones, { ...m, id: crypto.randomUUID(), reactions: {}, order: milestones.length }];
      persist(next);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Milestone> }) => {
      persist(milestones.map(m => m.id === id ? { ...m, ...patch } : m));
    },
  });

  const react = useMutation({
    mutationFn: async ({ id, wallet, emoji }: { id: string; wallet: string; emoji: string }) => {
      persist(milestones.map(m => m.id === id ? { ...m, reactions: { ...m.reactions, [wallet]: emoji } } : m));
    },
  });

  const reorder = useMutation({
    mutationFn: async (ordered: string[]) => {
      persist(milestones.map(m => ({ ...m, order: ordered.indexOf(m.id) })).sort((a, b) => a.order - b.order));
    },
  });

  const progress = { total: milestones.length, done: milestones.filter(m => m.status === 'done').length };

  return { milestones, create, update, react, reorder, progress };
}
