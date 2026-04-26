import { describe, expect, it } from 'vitest';
import {
	isFileAccepted,
	unsupportedFormatMessage,
} from '@/utils/fileFormat.utils';

function makeFile(name: string, type: string): File {
	return new File([new Uint8Array([0])], name, { type });
}

describe('isFileAccepted', () => {
	it('matches by extension token', () => {
		expect(isFileAccepted(makeFile('avatar.png', 'image/png'), '.png')).toBe(
			true
		);
		expect(
			isFileAccepted(makeFile('avatar.PNG', 'image/png'), '.png')
		).toBe(true);
	});

	it('rejects extensions that are not in the accept list', () => {
		expect(isFileAccepted(makeFile('avatar.bmp', 'image/bmp'), '.png,.jpg')).toBe(
			false
		);
	});

	it('matches by exact MIME type', () => {
		expect(
			isFileAccepted(makeFile('avatar.png', 'image/png'), 'image/png')
		).toBe(true);
		expect(
			isFileAccepted(
				makeFile('avatar.png', 'image/png'),
				'image/jpeg'
			)
		).toBe(false);
	});

	it('honors the image/* wildcard', () => {
		expect(
			isFileAccepted(makeFile('avatar.png', 'image/png'), 'image/*')
		).toBe(true);
		expect(
			isFileAccepted(makeFile('doc.pdf', 'application/pdf'), 'image/*')
		).toBe(false);
	});

	it('treats an empty accept list as accepting any file', () => {
		expect(isFileAccepted(makeFile('anything', ''), '')).toBe(true);
	});

	it('handles whitespace and mixed case in the accept list', () => {
		expect(
			isFileAccepted(
				makeFile('avatar.png', 'image/png'),
				'  .JPG, .PNG '
			)
		).toBe(true);
	});
});

describe('unsupportedFormatMessage', () => {
	it('lists allowed formats in upper case without leading dots', () => {
		expect(unsupportedFormatMessage('.png,.jpg')).toBe(
			"That file format isn't supported. Use PNG, JPG."
		);
	});

	it('falls back to generic copy when accept is empty', () => {
		expect(unsupportedFormatMessage('')).toBe(
			"That file format isn't supported. Pick a different file."
		);
	});

	it('preserves wildcards as-is so MIME ranges read sensibly', () => {
		expect(unsupportedFormatMessage('image/*')).toBe(
			"That file format isn't supported. Use IMAGE/*."
		);
	});
});
