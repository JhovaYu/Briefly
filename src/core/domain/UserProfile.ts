// User profile — stored in localStorage (personal, not synced P2P)
export interface UserProfile {
    id: string;
    name: string;
    color: string;
    createdAt: number;
}

// Pool metadata — stored in localStorage (personal list of pools)
export interface PoolInfo {
    id: string;
    name: string;
    icon: string;
    lastOpened: number;
    createdAt: number;
}

// Helper: get/set user profile from localStorage
export function getUserProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem('fluent-user-profile');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveUserProfile(profile: UserProfile): void {
    localStorage.setItem('fluent-user-profile', JSON.stringify(profile));
}

// Helper: get/set pool list from localStorage
export function getSavedPools(): PoolInfo[] {
    try {
        const raw = localStorage.getItem('fluent-pools');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function savePools(pools: PoolInfo[]): void {
    localStorage.setItem('fluent-pools', JSON.stringify(pools));
}

export function addPool(pool: PoolInfo): void {
    const pools = getSavedPools();
    const existing = pools.findIndex((p) => p.id === pool.id);
    if (existing >= 0) {
        pools[existing] = { ...pools[existing], lastOpened: Date.now() };
    } else {
        pools.push(pool);
    }
    savePools(pools);
}

export function removePool(poolId: string): void {
    const pools = getSavedPools().filter((p) => p.id !== poolId);
    savePools(pools);
}

export function updatePoolLastOpened(poolId: string): void {
    const pools = getSavedPools();
    const pool = pools.find((p) => p.id === poolId);
    if (pool) {
        pool.lastOpened = Date.now();
        savePools(pools);
    }
}
