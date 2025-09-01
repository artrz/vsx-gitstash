/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import Node from '../../StashNode/Node'
import TreeNode from './TreeNode'

export default class MessageNode extends TreeNode {
    constructor(
        protected _message: string,
        protected _parent?: Node,
    ) {
        super()
    }

    public get message(): string {
        return this._message
    }

    /**
     * Gets the parent stash node.
     */
    public get parent(): Node | undefined {
        return this._parent
    }

    public get id(): string {
        return `M.${this.message}`
    }
}
