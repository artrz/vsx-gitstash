/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import Node from './Node'
import StashNode from './StashNode'

export default class RepositoryNode extends Node {
    constructor(
        protected _basePath: string,
        protected _dirName: string,
        protected _label?: string,
        protected _children?: StashNode[],
    ) {
        super()
        this.makeId('r', this.path)
    }

    /**
     * The absolute path of the repository.
     * `/path/to/repository`
     */
    get path(): string {
        return `${this.basePath}/${this.dirName}`
    }

    /**
     * The absolute base path of the repository (i.e. path without last directory).
     * /`path/to`/repository
     */
    get basePath(): string {
        return this._basePath
    }

    /**
     * The repository root directory (i.e. last directory from the location path).
     * /path/to/`repository`
     */
    get dirName(): string {
        return this._dirName
    }

    get label(): string {
        return this._label ?? this.dirName
    }

    /**
     * The children.
     */
    get children(): StashNode[] | undefined {
        return this._children
    }

    /**
     * The children count if available.
     */
    get childrenCount(): number | undefined {
        return this._children
            ? this._children.length
            : undefined
    }

    /**
     * Sets the children.
     */
    public setChildren(children: StashNode[]): this {
        this._children = children
        return this
    }
}
