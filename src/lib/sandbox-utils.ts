/**
 * Utility functions for sandbox management
 */

export const SANDBOX_TIMEOUT_MS = 60_000 * 10 * 2; // 20 minutes
export const SANDBOX_WARNING_THRESHOLD_MS = 60_000 * 18; // 18 minutes

/**
 * Checks if a sandbox URL is likely expired based on creation time
 * @param fragment - The fragment containing sandbox information
 * @returns true if sandbox should be automatically restored
 */
export function shouldAutoRestoreSandbox(fragment: { createdAt: Date; sandboxUrl?: string | null }): boolean {
    if (!fragment.sandboxUrl) return true;
    
    const now = new Date();
    const createdAt = new Date(fragment.createdAt);
    const ageMs = now.getTime() - createdAt.getTime();
    
    // Auto-restore if sandbox is older than 18 minutes
    return ageMs > SANDBOX_WARNING_THRESHOLD_MS;
}

/**
 * Gets the age of a sandbox in a human-readable format
 * @param fragment - The fragment containing sandbox information
 * @returns Human-readable age string
 */
export function getSandboxAge(fragment: { createdAt: Date }): string {
    const now = new Date();
    const createdAt = new Date(fragment.createdAt);
    const ageMs = now.getTime() - createdAt.getTime();
    
    const minutes = Math.floor(ageMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
        return `${minutes}m ago`;
    } else {
        return 'Just now';
    }
}

/**
 * Checks if sandbox is in warning state (close to expiry)
 * @param fragment - The fragment containing sandbox information
 * @returns true if sandbox is in warning state
 */
export function isSandboxInWarningState(fragment: { createdAt: Date }): boolean {
    const now = new Date();
    const createdAt = new Date(fragment.createdAt);
    const ageMs = now.getTime() - createdAt.getTime();
    
    // Warning state: between 15-18 minutes
    return ageMs >= (60_000 * 15) && ageMs <= SANDBOX_WARNING_THRESHOLD_MS;
}

/**
 * Checks if sandbox is expired
 * @param fragment - The fragment containing sandbox information
 * @returns true if sandbox is expired
 */
export function isSandboxExpired(fragment: { createdAt: Date }): boolean {
    const now = new Date();
    const createdAt = new Date(fragment.createdAt);
    const ageMs = now.getTime() - createdAt.getTime();
    
    return ageMs > SANDBOX_TIMEOUT_MS;
}
