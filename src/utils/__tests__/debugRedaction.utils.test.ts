import { describe, it, expect } from 'vitest';
import {
	redactString,
	redactDiagnostics,
	serializeRedactedDiagnostics,
} from '../debugRedaction.utils';

describe('debugRedaction.utils (#1447)', () => {
	it('redacts Stellar Ed25519 public addresses (G...) and secret keys (S...)', () => {
		const stellarPublic =
			'GDEMOWALLET0000000000000000000000000000000000000000000000001';
		const stellarSecret =
			'SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3FAC6WGSLibrariesAreCool123456';
		const input = `User with wallet ${stellarPublic} and secret ${stellarSecret} logged in`;

		const output = redactString(input);
		expect(output).not.toContain(stellarPublic);
		expect(output).not.toContain(stellarSecret);
		expect(output).toContain('[REDACTED_STELLAR_ADDR]');
	});

	it('redacts EVM Ethereum addresses', () => {
		const evmAddr = '0x1234567890123456789012345678901234567890';
		const input = `Connected to EVM contract at ${evmAddr}`;

		const output = redactString(input);
		expect(output).not.toContain(evmAddr);
		expect(output).toContain('[REDACTED_EVM_ADDR]');
	});

	it('redacts JWT authentication tokens and Bearer tokens', () => {
		const fakeJwt =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
		const input = `Authorization header: Bearer ${fakeJwt}`;

		const output = redactString(input);
		expect(output).not.toContain(fakeJwt);
		expect(output).toContain('[REDACTED_JWT_TOKEN]');
	});

	it('deeply scrubs objects containing sensitive keys and address values', () => {
		const diagnostics = {
			user: {
				address:
					'GDEMOWALLET0000000000000000000000000000000000000000000000001',
				password: 'mySuperSecretPassword123!',
				token: 'secret_token_value',
			},
			system: {
				mode: 'development',
				rpc: 'https://soroban-testnet.stellar.org',
			},
		};

		const serialized = serializeRedactedDiagnostics(diagnostics);
		const redacted = redactDiagnostics(diagnostics);
		expect(redacted.user).toEqual({
			address: '[REDACTED]',
			password: '[REDACTED]',
			token: '[REDACTED]',
		});
		expect(serialized).not.toContain(
			'GDEMOWALLET0000000000000000000000000000000000000000000000001'
		);
		expect(serialized).not.toContain('mySuperSecretPassword123!');
		expect(serialized).not.toContain('secret_token_value');
		expect(serialized).toContain('[REDACTED]');
		expect(serialized).toContain('https://soroban-testnet.stellar.org');
	});
});
