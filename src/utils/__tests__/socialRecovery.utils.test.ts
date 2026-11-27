import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import {
	MAX_GUARDIANS,
	MIN_GUARDIANS,
	RECOVERY_DELAY_MS,
	approveRecovery,
	cancelRecovery,
	createRecoveryRequest,
	defaultThreshold,
	executeRecovery,
	formatRecoveryCountdown,
	getRecoveryProgress,
	hasGuardianSetErrors,
	pendingRequestForOwner,
	requestsForGuardian,
	validateGuardianAddress,
	validateGuardianSet,
	type GuardianConfig,
	type RecoveryRequest,
} from '@/utils/socialRecovery.utils';

const address = () => Keypair.random().publicKey();
const addresses = (count: number) => Array.from({ length: count }, address);

const OWNER = address();
const NEW_OWNER = address();
const NOW = 1_700_000_000_000;

function makeConfig(overrides: Partial<GuardianConfig> = {}): GuardianConfig {
	return {
		owner: OWNER,
		guardians: addresses(3),
		threshold: 2,
		delayMs: RECOVERY_DELAY_MS,
		updatedAt: NOW,
		...overrides,
	};
}

function makeRequest(config = makeConfig()): RecoveryRequest {
	const result = createRecoveryRequest({
		id: 'r1',
		config,
		newOwner: NEW_OWNER,
		now: NOW,
	});
	if (!result.ok) throw new Error(result.error);
	return result.request;
}

describe('validateGuardianAddress (#1382)', () => {
	it('accepts a valid new Stellar address and normalises case/whitespace', () => {
		const candidate = address();
		expect(
			validateGuardianAddress(`  ${candidate.toLowerCase()} `, [], OWNER)
		).toBeNull();
	});

	it('rejects empty and malformed addresses', () => {
		expect(validateGuardianAddress('', [], OWNER)).toMatch(/required/);
		expect(validateGuardianAddress('not-an-address', [], OWNER)).toMatch(
			/valid Stellar/
		);
		expect(validateGuardianAddress('0xabc', [], OWNER)).toMatch(
			/valid Stellar/
		);
	});

	it("rejects the owner's own address", () => {
		expect(validateGuardianAddress(OWNER, [], OWNER)).toMatch(/your own/);
	});

	it('rejects duplicates', () => {
		const existing = address();
		expect(
			validateGuardianAddress(existing.toLowerCase(), [existing], OWNER)
		).toMatch(/already been added/);
	});

	it(`rejects an eighth guardian once ${MAX_GUARDIANS} are added`, () => {
		expect(
			validateGuardianAddress(address(), addresses(MAX_GUARDIANS), OWNER)
		).toMatch(/at most/);
	});
});

describe('validateGuardianSet (#1382)', () => {
	it('rejects fewer than 3 guardians', () => {
		const errors = validateGuardianSet(
			addresses(MIN_GUARDIANS - 1),
			2,
			OWNER
		);
		expect(errors.guardians).toMatch(/at least 3/);
	});

	it('rejects more than 7 guardians', () => {
		const errors = validateGuardianSet(
			addresses(MAX_GUARDIANS + 1),
			2,
			OWNER
		);
		expect(errors.guardians).toMatch(/at most 7/);
	});

	it.each([3, 5, 7])('accepts %i guardians', count => {
		expect(
			hasGuardianSetErrors(
				validateGuardianSet(
					addresses(count),
					defaultThreshold(count),
					OWNER
				)
			)
		).toBe(false);
	});

	it('rejects duplicates, invalid entries and the owner', () => {
		const [a, b] = addresses(2);
		expect(validateGuardianSet([a, b, a], 2, OWNER).guardians).toMatch(
			/only be added once/
		);
		expect(validateGuardianSet([a, b, 'bad'], 2, OWNER).guardians).toMatch(
			/valid Stellar/
		);
		expect(validateGuardianSet([a, b, OWNER], 2, OWNER).guardians).toMatch(
			/your own/
		);
	});

	it('rejects a threshold below 2, above the guardian count or fractional', () => {
		const guardians = addresses(3);
		expect(validateGuardianSet(guardians, 1, OWNER).threshold).toMatch(
			/at least 2/
		);
		expect(validateGuardianSet(guardians, 4, OWNER).threshold).toMatch(
			/exceed/
		);
		expect(validateGuardianSet(guardians, 2.5, OWNER).threshold).toMatch(
			/whole number/
		);
	});

	it('defaults the threshold to a majority', () => {
		expect(defaultThreshold(3)).toBe(2);
		expect(defaultThreshold(4)).toBe(3);
		expect(defaultThreshold(7)).toBe(4);
	});
});

describe('recovery lifecycle (#1382)', () => {
	it('starts pending with no approvals and the configured delay', () => {
		const request = makeRequest();
		expect(request.status).toBe('pending');
		expect(request.approvals).toEqual([]);
		expect(request.executableAt).toBe(NOW + RECOVERY_DELAY_MS);
	});

	it('refuses a new owner equal to the current owner', () => {
		const result = createRecoveryRequest({
			id: 'x',
			config: makeConfig(),
			newOwner: OWNER,
			now: NOW,
		});
		expect(result.ok).toBe(false);
	});

	it('lets each named guardian approve once and rejects others', () => {
		const config = makeConfig();
		const request = makeRequest(config);
		const first = approveRecovery(request, config.guardians[0].toLowerCase());
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.request.approvals).toEqual([config.guardians[0]]);

		const again = approveRecovery(first.request, config.guardians[0]);
		expect(again).toEqual({
			ok: false,
			error: 'You have already approved this recovery',
		});

		expect(approveRecovery(request, address()).ok).toBe(false);
	});

	it('offers execution only after both threshold and delay are met', () => {
		const config = makeConfig();
		let request = makeRequest(config);
		const afterDelay = NOW + RECOVERY_DELAY_MS;

		// Delay elapsed but no approvals.
		expect(getRecoveryProgress(request, afterDelay).canExecute).toBe(false);
		expect(executeRecovery(request, afterDelay).ok).toBe(false);

		for (const guardian of config.guardians.slice(0, 2)) {
			const result = approveRecovery(request, guardian);
			if (!result.ok) throw new Error(result.error);
			request = result.request;
		}

		// Threshold met but delay still running.
		const during = getRecoveryProgress(request, NOW + 1000);
		expect(during.thresholdMet).toBe(true);
		expect(during.canExecute).toBe(false);
		expect(during.msUntilExecution).toBe(RECOVERY_DELAY_MS - 1000);
		expect(executeRecovery(request, NOW + 1000)).toEqual({
			ok: false,
			error: 'The safety delay has not ended yet',
		});

		expect(getRecoveryProgress(request, afterDelay).canExecute).toBe(true);
		const executed = executeRecovery(request, afterDelay);
		expect(executed.ok && executed.request.status).toBe('executed');
	});

	it('lets only the owner cancel during the delay and clears approvals', () => {
		const config = makeConfig();
		const approved = approveRecovery(
			makeRequest(config),
			config.guardians[0]
		);
		if (!approved.ok) throw new Error(approved.error);

		expect(cancelRecovery(approved.request, NEW_OWNER, NOW).ok).toBe(false);
		expect(
			cancelRecovery(approved.request, OWNER, NOW + RECOVERY_DELAY_MS).ok
		).toBe(false);

		const cancelled = cancelRecovery(approved.request, OWNER, NOW + 5);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) return;
		expect(cancelled.request.status).toBe('cancelled');
		expect(cancelled.request.approvals).toEqual([]);
		expect(approveRecovery(cancelled.request, config.guardians[1]).ok).toBe(
			false
		);
		expect(
			executeRecovery(cancelled.request, NOW + RECOVERY_DELAY_MS).ok
		).toBe(false);
	});

	it('shows guardians only pending requests that name them', () => {
		const mine = makeRequest();
		const other = makeRequest(makeConfig({ owner: address() }));
		const guardian = mine.guardians[0];
		const cancelled: RecoveryRequest = {
			...mine,
			id: 'r2',
			status: 'cancelled',
		};

		expect(
			requestsForGuardian([mine, other, cancelled], guardian.toLowerCase())
		).toEqual([mine]);
		expect(requestsForGuardian([mine, other], address())).toEqual([]);
		expect(requestsForGuardian([mine], undefined)).toEqual([]);
		expect(pendingRequestForOwner([cancelled, mine], OWNER)).toBe(mine);
	});
});

describe('formatRecoveryCountdown', () => {
	it('formats days, hours and minutes', () => {
		expect(formatRecoveryCountdown(RECOVERY_DELAY_MS)).toBe('2d 00h 00m');
		expect(formatRecoveryCountdown(3_723_000)).toBe('1h 02m');
		expect(formatRecoveryCountdown(65_000)).toBe('1m 05s');
		expect(formatRecoveryCountdown(-5)).toBe('0m 00s');
	});
});
