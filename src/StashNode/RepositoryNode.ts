/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import Node from './Node'
import * as path from 'path'
import StashNode from './StashNode'

export default class RepositoryNode extends Node {
    constructor(
        protected _basePath: string,
        protected _dirName: string,
        protected _label?: string,
        protected _children?: StashNode[],
    ) {
        super(_label ?? _dirName)
    }

    /**
     * Gets the path of the repository.
     */
    public get path(): string {
        return `${this.basePath}${path.sep}${this.dirName}`
    }

    public get basePath(): string {
        return this._basePath
    }

    public get dirName(): string {
        return this._dirName
    }

    public get label(): string {
        return this._label ?? this.dirName
    }

    /**
     * Gets the children.
     */
    public get children(): StashNode[] | undefined {
        return this._children
    }

    /**
     * Gets the children count if available.
     */
    public get childrenCount(): number | undefined {
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

    public get id(): string {
        return `R.${this.path}`
    }
}
