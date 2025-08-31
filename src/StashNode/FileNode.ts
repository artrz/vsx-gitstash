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
        super(`${_subPath}${path.sep}${_fileName}`)
    }

    public get type(): FileNodeType {
        return this._type
    }

    public get parent(): StashNode {
        return this._parent
    }

    public get fileName(): string {
        return this._fileName
    }

    /**
     * Gets the relative file base path, i.e. the relative path without filename.
     */
    public get subPath(): string {
        return this._subPath
    }

    /**
     * Gets the relative file path of the stashed file.
     */
    public get relativePath(): string {
        return this.subPath !== '.'
            ? `${this.subPath}${path.sep}${this.fileName}`
            : this.fileName
    }

    /**
     * Gets the absolute file path of the stashed file.
     */
    public get path(): string {
        return `${this.parent.path}${path.sep}${this.relativePath}`
    }

    public get oldFileName(): string | undefined {
        return this._oldFileName
    }

    public get oldSubPath(): string | undefined {
        return this._oldSubPath
    }

    public get oldRelativePath(): string | undefined {
        return this.oldSubPath !== '.'
            ? `${this.oldSubPath}${path.sep}${this.oldFileName}`
            : this.oldFileName
    }

    public get oldPath(): string {
        return `${this.parent.path}${path.sep}${this.oldRelativePath}`
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

    public get id(): string {
        return `F-${this.type}.${this.parent.path}`
            + `.${this.parent.shortHash}.${this.relativePath}`
    }
}
