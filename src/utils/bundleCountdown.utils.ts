/**
 * Formats the time remaining until a bundle expires. Returns a compact
 * string suitable for a card badge, e.g. "3d 4h", "12h 30m", "45m",
 * "expired". Returns null when the input is not a parseable ISO string.
 */
export function formatBundleCountdown(
    expiresAt: string,
    now: number = Date.now()
): string | null {
    const expiry = Date.parse(expiresAt);
    if (Number.isNaN(expiry)) return null;

    const remainingMs = expiry - now;
    if (remainingMs <= 0) return 'expired';

    const totalMinutes = Math.floor(remainingMs / 60_000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    const minutes = totalMinutes - days * 60 * 24 - hours * 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/** True if `expiresAt` is in the past relative to `now`. */
export function isBundleExpired(
    expiresAt: string,
    now: number = Date.now()
): boolean {
    const expiry = Date.parse(expiresAt);
    if (Number.isNaN(expiry)) return true;
    return expiry <= now;
}