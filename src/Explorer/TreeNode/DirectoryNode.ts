/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import FileNode from '../../StashNode/FileNode'
import TreeNode from './TreeNode'

export default class DirectoryNode extends TreeNode {
    constructor(
        public name: string,
        public directories: DirectoryNode[],
        public files: FileNode[],
    ) {
        super()
    }

    public get children(): (DirectoryNode | FileNode)[] {
        return [...this.directories, ...this.files]
    }

    public get id(): string {
        return `D.${this.name}`
    }
}
