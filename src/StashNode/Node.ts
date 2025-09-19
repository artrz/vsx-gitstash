/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

export default abstract class Node {
    protected _id!: string

    get id(): string {
        return this._id
    }

    /**
     * Creates the node id.
     * This should be called from the constructors.
     * Independent function so object accessors can be used when calling this.
     */
    protected makeId(prefix: string, ...segments: string[]): string {
        return this._id = `${prefix}.` + segments
            .map((segment) => segment.toLocaleLowerCase().replaceAll(/[^a-z0-9]/g, '_'))
            .join('.')
    }
}
