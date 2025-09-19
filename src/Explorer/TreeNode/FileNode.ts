/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import BaseFileNode from '../../StashNode/FileNode'
import DirectoryNode from './DirectoryNode'
import FileNodeType from '../../StashNode/FileNodeType'
import StashNode from '../../StashNode/StashNode'
import TreeNode from './TreeNode'

/**
 * This node extending a FileNode has a `branchParent` pointing to the parent node in
 * a traversable directory/file tree structure.
 */
export default class FileNode extends BaseFileNode implements TreeNode {
    constructor(
        protected _branchParent: StashNode | DirectoryNode,
        protected _type: FileNodeType,
        protected _parent: StashNode,
        protected _subPath: string,
        protected _fileName: string,
        protected _oldSubPath?: string,
        protected _oldFileName?: string,
    ) {
        super(_type, _parent, _subPath, _fileName, _oldSubPath, _oldFileName)
    }

    get branchParent(): StashNode | DirectoryNode {
        return this._branchParent
    }
}
