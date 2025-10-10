/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import FileNodeType from './FileNodeType'
import Node from './Node'
import StashNode from './StashNode'

export default class FileNode extends Node {
    constructor(
        protected _type: FileNodeType,
        protected _parent: StashNode,
        protected _subPath: string,
        protected _fileName: string,
        protected _oldSubPath?: string,
        protected _oldFileName?: string,
    ) {
        super()
        this.makeId(`f${_type}`, _parent.path, _parent.shortHash, this.relativePath)
    }

    get type(): FileNodeType {
        return this._type
    }

    get parent(): StashNode {
        return this._parent
    }

    /**
     * The absolute path of the stashed file.
     */
    get path(): string {
        return `${this.parent.path}/${this.relativePath}`
    }

    /**
     * The relative file path of the stashed file, i.e. the path without the repository.
     * /path/to/repository/`sub/path/file.ext`
     */
    get relativePath(): string {
        return this.subPath !== '.'
            ? `${this.subPath}/${this.fileName}`
            : this.fileName
    }

    /**
     * The relative base path, i.e. relative path without filename. May be '.'.
     * /path/to/repository/`sub/path`/file.ext
     */
    get subPath(): string {
        return this._subPath
    }

    get fileName(): string {
        return this._fileName
    }

    get oldPath(): string | undefined {
        return this.oldRelativePath
            ? `${this.parent.path}/${this.oldRelativePath}`
            : undefined
    }

    /**
     * @see FileNode.relativePath()
     */
    get oldRelativePath(): string | undefined {
        if (!this.oldFileName) { return undefined }
        return this.oldRelativePath
            ? `${this.oldSubPath}/${this.oldFileName}`
            : undefined
    }

    /**
     * @see FileNode.subPath()
     */
    get oldSubPath(): string | undefined {
        return this._oldSubPath
    }

    get oldFileName(): string | undefined {
        return this._oldFileName
    }

    get date(): Date {
        return this.parent.date
    }

    get isAdded(): boolean {
        return this.type === FileNodeType.Added
    }

    get isDeleted(): boolean {
        return this.type === FileNodeType.Deleted
    }

    get isModified(): boolean {
        return this.type === FileNodeType.Modified
    }

    get isRenamed(): boolean {
        return this.type === FileNodeType.Renamed
    }

    get isUntracked(): boolean {
        return this.type === FileNodeType.Untracked
    }
}
