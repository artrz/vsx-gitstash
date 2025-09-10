/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as path from 'path'
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

    public get type(): FileNodeType {
        return this._type
    }

    public get parent(): StashNode {
        return this._parent
    }

    /**
     * The absolute path of the stashed file.
     */
    public get path(): string {
        return `${this.parent.path}${path.sep}${this.relativePath}`
    }

    /**
     * The relative file path of the stashed file, i.e. the path without the repository.
     * /path/to/repository/`sub/path/file.ext`
     */
    public get relativePath(): string {
        return path.normalize(`${this.subPath}${path.sep}${this.fileName}`)
    }

    /**
     * The relative base path, i.e. relative path without last directory. May be '.'.
     * /path/to/repository/`sub/path`/file.ext
     */
    public get subPath(): string {
        return this._subPath
    }

    public get fileName(): string {
        return this._fileName
    }

    public get oldPath(): string | undefined {
        return this.oldRelativePath
            ? `${this.parent.path}${path.sep}${this.oldRelativePath}`
            : undefined
    }

    /**
     * @see FileNode.relativePath()
     */
    public get oldRelativePath(): string | undefined {
        return this.oldFileName
            ? path.normalize(`${this.oldSubPath}${path.sep}${this.oldFileName}`)
            : undefined
    }

    public get oldSubPath(): string | undefined {
        return this._oldSubPath
    }

    public get oldFileName(): string | undefined {
        return this._oldFileName
    }

    public get date(): Date {
        return this.parent.date
    }

    public get isAdded(): boolean {
        return this.type === FileNodeType.Added
    }

    public get isDeleted(): boolean {
        return this.type === FileNodeType.Deleted
    }

    public get isModified(): boolean {
        return this.type === FileNodeType.Modified
    }

    public get isRenamed(): boolean {
        return this.type === FileNodeType.Renamed
    }

    public get isUntracked(): boolean {
        return this.type === FileNodeType.Untracked
    }
}
