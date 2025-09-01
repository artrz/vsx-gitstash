/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import BaseMessageNode from '../../StashNode/MessageNode'
import Node from '../../StashNode/Node'
// import TreeNode from './TreeNode'

export default class MessageNode extends BaseMessageNode {
    constructor(
        protected _message: string,
        protected _parent?: Node,
    ) {
        super(_message, _parent)
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
