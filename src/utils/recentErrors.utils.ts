import { redactString } from './debugRedaction.utils';

export interface RecentErrorEntry {
	id: string;
	message: string;
	source: 'api' | 'boundary' | 'client';
	timestamp: number;
}

const MAX_RECENT_ERRORS = 20;

class RecentErrorsBuffer {
	private errors: RecentErrorEntry[] = [];
	private listeners: Set<(errors: RecentErrorEntry[]) => void> = new Set();

	public record(rawMessage: string, source: 'api' | 'boundary' | 'client' = 'client'): void {
		// Clean message: remove stack traces containing potential secrets, keep first line/core message
		const firstLine = (rawMessage || 'Unknown error').split('\n')[0].trim();
		const sanitizedMessage = redactString(firstLine);

		const entry: RecentErrorEntry = {
			id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			message: sanitizedMessage,
			source,
			timestamp: Date.now(),
		};

		this.errors.unshift(entry);
		if (this.errors.length > MAX_RECENT_ERRORS) {
			this.errors = this.errors.slice(0, MAX_RECENT_ERRORS);
		}

		this.notify();
	}

	public getAll(): RecentErrorEntry[] {
		return [...this.errors];
	}

	public clear(): void {
		this.errors = [];
		this.notify();
	}

	public subscribe(listener: (errors: RecentErrorEntry[]) => void): () => void {
		this.listeners.add(listener);
		listener(this.getAll());
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify(): void {
		const current = this.getAll();
		for (const listener of this.listeners) {
			try {
				listener(current);
			} catch (err) {
				console.error('Error notifying error buffer listener', err);
			}
		}
	}
}

export const recentErrorsBuffer = new RecentErrorsBuffer();

export function recordRecentError(
	message: string,
	source: 'api' | 'boundary' | 'client' = 'client'
): void {
	recentErrorsBuffer.record(message, source);
}
