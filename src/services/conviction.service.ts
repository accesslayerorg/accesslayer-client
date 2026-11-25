import { BaseApiService } from './api.service';
import type {
	ConvictionBalances,
	ConvictionProposal,
} from '@/types/conviction';
import { calculateConvictionBalances } from '@/utils/conviction.utils';

const INITIAL_PROPOSALS: ConvictionProposal[] = [
	{
		id: 'conv-1',
		title: 'Community Grants Round 3 — Protocol Tooling',
		description:
			'Fund independent open-source developers building developer tooling, SDK wrappers, and analytics dashboards for the AccessLayer ecosystem.',
		creatorId: 'GCXW...DEVELOPERS',
		creatorAddress: 'GCXWDEVELOPERSACCESSLAYERKEYG7432',
		requestedAmount: 15000,
		status: 'active',
		threshold: 1000,
		currentConviction: 750,
		totalStake: 150,
		userStake: 50,
		alpha: 0.9,
		beneficiary: 'GCXWDEVELOPERSACCESSLAYERKEYG7432',
		createdAt: '2026-11-15T09:00:00Z',
	},
	{
		id: 'conv-2',
		title: 'Security Audit Sponsorship for Smart Contracts',
		description:
			'Engage third-party security auditors to inspect the upcoming multi-sig timelock and ragequit reserve contracts.',
		creatorId: 'GAUD...SECURITY',
		creatorAddress: 'GAUDITSECURITYACCESSLAYERKEY78901',
		requestedAmount: 25000,
		status: 'active',
		threshold: 1500,
		currentConviction: 1550, // Crossed threshold!
		totalStake: 200,
		userStake: 80,
		alpha: 0.9,
		beneficiary: 'GAUDITSECURITYACCESSLAYERKEY78901',
		createdAt: '2026-11-10T14:30:00Z',
	},
	{
		id: 'conv-3',
		title: 'Liquidity Pool Incentive Extension',
		description:
			'Extend ongoing liquidity incentives for top-tier creator key Automated Market Maker pairs for another quarter.',
		creatorId: 'GLIQ...INCENTIVES',
		creatorAddress: 'GLIQUIDITYINCENTIVESKEYACCESS9911',
		requestedAmount: 50000,
		status: 'executed',
		threshold: 2500,
		currentConviction: 2600,
		totalStake: 300,
		userStake: 100,
		alpha: 0.9,
		outcome:
			'Proposal executed successfully. 50,000 XLM transferred to the Liquidity Reserve distributor contract.',
		executedAt: '2026-11-20T10:00:00Z',
		beneficiary: 'GLIQUIDITYINCENTIVESKEYACCESS9911',
		createdAt: '2026-11-01T12:00:00Z',
	},
	{
		id: 'conv-4',
		title: 'Marketing & Global Creator Onboarding Initiative',
		description:
			'Organize virtual workshops and grants for new creative artists and content publishers launching keys.',
		creatorId: 'GCRE...MARKETING',
		creatorAddress: 'GCREATORGROWTHMARKETINGKEY002233',
		requestedAmount: 8000,
		status: 'active',
		threshold: 800,
		currentConviction: 200,
		totalStake: 30,
		userStake: 0,
		alpha: 0.9,
		beneficiary: 'GCREATORGROWTHMARKETINGKEY002233',
		createdAt: '2026-11-18T16:00:00Z',
	},
];

class ConvictionService extends BaseApiService {
	private proposals: ConvictionProposal[] = [...INITIAL_PROPOSALS];
	private userTotalStakeable: number = 500;
	private userAllocations: Record<string, number> = {
		'conv-1': 50,
		'conv-2': 80,
		'conv-3': 100,
		'conv-4': 0,
	};

	async getProposals(): Promise<ConvictionProposal[]> {
		return structuredClone(this.proposals);
	}

	async getProposal(id: string): Promise<ConvictionProposal | null> {
		const match = this.proposals.find(p => p.id === id);
		return match ? structuredClone(match) : null;
	}

	async getUserBalances(_userAddress?: string): Promise<ConvictionBalances> {
		return calculateConvictionBalances(
			this.userTotalStakeable,
			this.userAllocations
		);
	}

	async allocateStake(
		proposalId: string,
		amount: number,
		_userAddress?: string
	): Promise<ConvictionProposal> {
		const prop = this.proposals.find(p => p.id === proposalId);
		if (!prop) {
			throw new Error(`Proposal ${proposalId} not found`);
		}
		if (prop.status === 'executed' || prop.status === 'cancelled') {
			throw new Error(`Cannot allocate stake to a ${prop.status} proposal`);
		}

		const balances = await this.getUserBalances();
		const currentStake = this.userAllocations[proposalId] || 0;
		const maxAllowed = balances.unallocatedBalance + currentStake;

		if (amount > maxAllowed) {
			throw new Error(
				`Allocation ${amount} exceeds unallocated balance limit of ${maxAllowed}`
			);
		}

		const stakeDelta = amount - currentStake;
		this.userAllocations[proposalId] = amount;
		prop.userStake = amount;
		prop.totalStake = Math.max(0, prop.totalStake + stakeDelta);

		// If stake increased, conviction ticks up towards new max
		if (stakeDelta > 0) {
			prop.currentConviction += stakeDelta;
		}

		return structuredClone(prop);
	}

	async withdrawStake(
		proposalId: string,
		amount?: number,
		_userAddress?: string
	): Promise<ConvictionProposal> {
		const prop = this.proposals.find(p => p.id === proposalId);
		if (!prop) {
			throw new Error(`Proposal ${proposalId} not found`);
		}

		const currentStake = this.userAllocations[proposalId] || 0;
		const withdrawAmount =
			amount !== undefined ? Math.min(amount, currentStake) : currentStake;

		this.userAllocations[proposalId] = Math.max(
			0,
			currentStake - withdrawAmount
		);
		prop.userStake = this.userAllocations[proposalId];
		prop.totalStake = Math.max(0, prop.totalStake - withdrawAmount);

		// Note: conviction decays after withdrawal
		return structuredClone(prop);
	}

	async executeProposal(
		proposalId: string,
		_userAddress?: string
	): Promise<ConvictionProposal> {
		const prop = this.proposals.find(p => p.id === proposalId);
		if (!prop) {
			throw new Error(`Proposal ${proposalId} not found`);
		}
		if (prop.currentConviction < prop.threshold) {
			throw new Error(
				`Proposal has not crossed conviction threshold (${prop.currentConviction}/${prop.threshold})`
			);
		}
		if (prop.status === 'executed') {
			throw new Error(`Proposal is already executed`);
		}

		prop.status = 'executed';
		prop.outcome = `Executed successfully. ${prop.requestedAmount.toLocaleString()} XLM allocated to beneficiary ${prop.beneficiary || prop.creatorAddress || prop.creatorId}.`;
		prop.executedAt = new Date().toISOString();

		return structuredClone(prop);
	}

	// Helper for testing
	reset() {
		this.proposals = structuredClone(INITIAL_PROPOSALS);
		this.userTotalStakeable = 500;
		this.userAllocations = {
			'conv-1': 50,
			'conv-2': 80,
			'conv-3': 100,
			'conv-4': 0,
		};
	}
}

export const convictionService = new ConvictionService();
