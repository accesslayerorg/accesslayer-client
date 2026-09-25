/**
 * Retrieves a parsed value from localStorage.
 * Handles missing keys and malformed JSON safely by returning the defaultValue.
 *
 * @param key The localStorage key to retrieve
 * @param defaultValue The default value to return if the key is missing or parsing fails
 * @returns The parsed value or the default value
 */
export function getPreference<T>(key: string, defaultValue: T): T {
	try {
		const item = window.localStorage.getItem(key);
		if (item === null) {
			return defaultValue;
		}
		return JSON.parse(item) as T;
	} catch (error) {
		console.warn(`Error reading localStorage key "${key}":`, error);
		return defaultValue;
	}
}

/**
 * Serializes and stores a value in localStorage.
 * Safely handles potential storage errors (e.g., quota exceeded).
 *
 * @param key The localStorage key to set
 * @param value The value to serialize and store
 */
export function setPreference<T>(key: string, value: T): void {
	try {
		const serialized = JSON.stringify(value);
		window.localStorage.setItem(key, serialized);
	} catch (error) {
		console.warn(`Error setting localStorage key "${key}":`, error);
	}
}
