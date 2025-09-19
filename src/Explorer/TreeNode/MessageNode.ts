/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import Node from '../../StashNode/Node'

export default class MessageNode extends Node {
    constructor(
        protected _message: string,
        protected _parent?: Node,
    ) {
        super()
        this.makeId('m', _parent?.id ?? '', _message)
    }

    get message(): string {
        return this._message
    }

    /**
     * Gets the parent stash node.
     */
    get parent(): Node | undefined {
        return this._parent
    }
}
