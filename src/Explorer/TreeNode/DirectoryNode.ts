/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as path from 'path'
import FileNode from './FileNode'
import Node from '../../StashNode/Node'
import StashNode from '../../StashNode/StashNode'
import TreeNode from './TreeNode'

export default class DirectoryNode extends Node implements TreeNode {
    constructor(
        protected _branchParent: StashNode | DirectoryNode,
        protected _parent: StashNode,
        protected _basePath: string,
        protected _subPath: string,
        protected _dirName: string,
        public directories: DirectoryNode[],
        public files: FileNode[],
    ) {
        super()
        this.makeId('d', _basePath, _parent.shortHash, this.relativePath)
    }

    get branchParent(): StashNode | DirectoryNode {
        return this._branchParent
    }

    /**
     * The full path corresponding to this node.
     * `/path/to/repo/base/path/dirName`
     */
    get path(): string {
        return path.normalize(
            `${this.basePath}${path.sep}${this.relativePath}`,
        )
    }

    /**
     * The absolute base path of the repository.
     * `/path/to/repository`/sub/path/dirName
     */
    get basePath(): string {
        return this._basePath
    }

    /**
     * The relative directory path, i.e. the path without the repository basePath.
     * /path/to/repository/`sub/path/dirName`
     */
    get relativePath(): string {
        return path.normalize(`${this.subPath}${path.sep}${this.dirName}`)
    }

    /**
     * The relative base path, i.e. relative path without last directory. May be '.'.
     * /path/to/repository/`sub/path`/dirName
     */
    get subPath(): string {
        return this._subPath
    }

    /**
     * The directory name.
     * /path/to/repo/base/path/`dirName`
     */
    get dirName(): string {
        return this._dirName
    }

    get children(): (DirectoryNode | FileNode)[] {
        return [...this.directories, ...this.files]
    }
}
