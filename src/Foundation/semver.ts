/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

/**
 * Returns -1 if first parameter is higher, 0 if the same, 1 if second parameter is higher.
 */
export function compareVersions(v1: string, v2: string, levels = 3): number {
    const v1Parts = v1.split('.')
    const v2Parts = v2.split('.')
    for (let i = 0; i < levels; i += 1) {
        const s1 = Number(v1Parts[i])
        const s2 = Number(v2Parts[i])
        if (s1 > s2) { return -1 }
        if (s1 < s2) { return 1 }
    }
    return 0
}
