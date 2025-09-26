/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import Git, { ExeResult } from './Git'

export interface Stash {
    index: number
    date: Date
    hash: string
    shortHash: string
    subject: string
    tree: string
    parents: string[]
    note?: string
}

export interface RenameStash {
    new: string
    old: string
}

export interface StashedFiles {
    added: string[]
    deleted: string[]
    modified: string[]
    renamed: RenameStash[]
    untracked: string[]
}

export const enum FileStage {
    Change = 'c',
    Parent = 'p',
}

export default class StashGit extends Git {
    /**
     * Gets the raw git stash command data.
     *
     * @param cwd the current working directory
     */
    public async getRawStashes(cwd: string): Promise<null | string> {
        const params = [
            'stash',
            'list',
            '--format=%h',
        ]

        return (await this.exec(params, cwd).promise).out.trim() || null
    }

    /**
     * Gets the stashes list.
     *
     * @param cwd the current working directory
     */
    public async getStashes(cwd: string): Promise<Stash[]> {
        // https://git-scm.com/docs/git-log#_pretty_formats
        const params = [
            'stash',
            'list',
            '-z',
            '--format=%gd%n%ci%n%H%n%h%n%T%n%P%n%gs%n%N',
        ]

        const list = (await this.exec(params, cwd).promise).out
            .split('\0')
            .filter((rawStash: string) => rawStash.trim().length)
            .map((rawStash: string) => {
                const tokens = rawStash.split('\n')
                const index = tokens[0].replace(/\D/g, '') // stash@{\d+}
                const note = tokens.length >= 8
                    ? tokens.slice(6).join('\n')
                    : undefined

                return {
                    index: parseInt(index),
                    date: new Date(Date.parse(tokens[1])),
                    hash: tokens[2],
                    shortHash: tokens[3],
                    tree: tokens[4],
                    parents: tokens[5].split(' '),
                    subject: tokens[6],
                    note,
                }
            })

        return list
    }

    /**
     * Gets the stash files.
     *
     * @param cwd   the current working directory
     * @param index the int with the stash index
     */
    public async getStashedFiles(
        cwd: string,
        index: number,
        includeUntracked: boolean,
    ): Promise<StashedFiles> {
        const files: StashedFiles = {
            added: [],
            deleted: [],
            modified: [],
            renamed: [] as RenameStash[],
            untracked: [],
        }

        const params = [
            'stash',
            'show',
            '--name-status',
            `stash@{${index}}`,
        ]

        try {
            const stashData = (await this.exec(params, cwd).promise).out.trim()

            if (stashData.length > 0) {
                const stashedFiles = stashData.split(/\r?\n/g)
                stashedFiles.forEach((line: string) => {
                    const status = line.substring(0, 1)
                    const file = line.substring(1).trim()

                    if (status === 'A') {
                        files.added.push(file)
                    }
                    else if (status === 'D') {
                        files.deleted.push(file)
                    }
                    else if (status === 'M') {
                        files.modified.push(file)
                    }
                    else if (status === 'R') {
                        const fileNames = /^\d+\s+([^\t]+)\t(.+)$/.exec(file) as string[]
                        files.renamed.push({
                            new: fileNames[2],
                            old: fileNames[1],
                        })
                    }
                })
            }

            if (includeUntracked) {
                files.untracked = await this.getStashUntracked(cwd, index)
                console.log(files.untracked)
            }
        }
        catch (e) {
            console.log('StashGit.getStashedFiles')
            console.log(e)
        }

        return files
    }

    /**
     * Gets the stash's untracked files.
     *
     * @param cwd   the current working directory
     * @param index the int with the stash index
     */
    private async getStashUntracked(cwd: string, index: number): Promise<string[]> {
        const params = [
            'ls-tree',
            '-r',
            '-z',
            '--name-only',
            `stash@{${index}}^3`,
        ]

        return (await this.exec(params, cwd).promise).out
            .trim()
            .split('\0')
            .filter((entry) => entry.length)
    }

    /**
     * Gets the file contents from the stash commit.
     *
     * This gets the changed contents for:
     *  - index-added
     *  - modified
     *  - renamed
     *
     * @param cwd   the current working directory
     * @param index the int with the index of the parent stash
     * @param file  the string with the stashed file name
     */
    public async getStashContents(
        cwd: string,
        index: number,
        file: string,
    ): Promise<ExeResult> {
        const params = [
            'show',
            `stash@{${index}}:${file}`,
        ]

        return this.exec(params, cwd).promise
    }

    /**
     * Gets the file contents from the parent stash commit.
     *
     * This gets the original contents for:
     *  - deleted
     *  - modified
     *  - renamed
     *
     * @param cwd   the current working directory
     * @param index the int with the index of the parent stash
     * @param file  the string with the stashed file name
     */
    public async getParentContents(
        cwd: string,
        index: number,
        file: string,
    ): Promise<ExeResult> {
        const params = [
            'show',
            `stash@{${index}}^1:${file}`,
        ]

        return this.exec(params, cwd).promise
    }

    /**
     * Gets the file contents from the third (untracked) stash commit.
     *
     * @param cwd   the current working directory
     * @param index the int with the index of the parent stash
     * @param file  the string with the stashed file name
     */
    public async getThirdParentContents(
        cwd: string,
        index: number,
        file: string,
    ): Promise<ExeResult> {
        const params = [
            'show',
            `stash@{${index}}^3:${file}`,
        ]

        return this.exec(params, cwd).promise
    }

    // -------------------------------------------------------------------------

    /**
     * Creates a new stash.
     */
    public stash(cwd: string, extra: string[], message?: string) {
        const params = [
            'stash',
            'push',
            ...extra,
        ]

        if (message?.length) {
            params.push('--message', message)
        }

        return this.exec(params, cwd)
    }

    /**
     * Stashes the specified files only.
     */
    public push(cwd: string, filePaths: string[], message?: string) {
        const params = [
            'stash',
            'push',
            '--include-untracked',
        ]

        if (message?.length) {
            params.push('--message', message)
        }

        params.push('--')

        return this.exec(params.concat(filePaths), cwd)
    }

    /**
     * Removes the stashes list.
     */
    public clear(cwd: string) {
        const params = [
            'stash',
            'clear',
        ]

        return this.exec(params, cwd)
    }

    /**
     * Pops a stash.
     */
    public pop(cwd: string, index: number, withIndex: boolean) {
        const params = [
            'stash',
            'pop',
        ]

        if (withIndex) {
            params.push('--index')
        }

        params.push(`stash@{${index}}`)

        return this.exec(params, cwd)
    }

    /**
     * Applies a stash.
     */
    public apply(cwd: string, index: number, withIndex: boolean) {
        const params = [
            'stash',
            'apply',
        ]

        if (withIndex) {
            params.push('--index')
        }

        params.push(`stash@{${index}}`)

        return this.exec(params, cwd)
    }

    /**
     * Branches a stash.
     */
    public branch(cwd: string, index: number, name: string) {
        const params = [
            'stash',
            'branch',
            name,
            `stash@{${index}}`,
        ]

        return this.exec(params, cwd)
    }

    /**
     * Drops a stash.
     */
    public drop(cwd: string, index: number) {
        const params = [
            'stash',
            'drop',
            `stash@{${index}}`,
        ]

        return this.exec(params, cwd)
    }

    /**
     * Applies changes from a file.
     */
    public applySingle(cwd: string, index: number, subPath: string) {
        const params = [
            'checkout',
            `stash@{${index}}`,
            subPath,
        ]

        return this.exec(params, cwd)
    }

    /**
     * Applies changes from a file.
     */
    public createSingle(cwd: string, index: number, subPath: string) {
        const params = [
            'checkout',
            `stash@{${index}}^3`,
            subPath,
        ]

        return this.exec(params, cwd)
    }

    /**
     * Applies changes from a file.
     */
    public statusP2(cwd: string) {
        const params = [
            'status',
            '--porcelain=2',
            '-z',
        ]

        return this.exec(params, cwd)
    }
}
