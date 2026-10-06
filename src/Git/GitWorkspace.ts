/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as Workspace from '../Workspace'
import * as path from 'path'
import Config from '../Config'
import ExecError from '../Foundation/ExecError'
import Git, { Execution } from './Git'
import { Uri } from 'vscode'

export default class GitWorkspace extends Git {
    constructor(private config: Config, protected callback?: (exec: Execution) => void) {
        super(callback)
    }

    /**
     * Indicates if there's at least one repository available.
     */
    public async hasGitRepository(): Promise<boolean> {
        const repository = await this.getRepositories(true)

        return repository.length > 0
    }

    /**
     * Gets the directories for git repositories on the workspace.
     *
     * @param firstOnly indicates if return only the first repository
     */
    public async getRepositories(firstOnly?: boolean): Promise<string[]> {
        const depth: number = this.config.get(this.config.key.advancedRepoSearchDepth)
        const ignored: string[] = this.config.get(this.config.key.advancedIgnoredDirectories)

        const params = [
            'rev-parse',
            '--show-toplevel',
        ]

        const paths: string[] = []
        for (const cwd of Workspace.getRootPaths(depth, ignored)) {
            let gitPath: string | undefined
            try { gitPath = (await this.exec(params, cwd).promise).out.trim() }
            catch (error: unknown) {
                if (!(error instanceof ExecError) || error.code !== 128) { throw error }
                // 128 = fatal: not a git repository (or any of the parent directories): .git
            }

            if (!gitPath) {
                continue
            }

            gitPath = Uri.file(gitPath).fsPath
            if (!paths.includes(gitPath)) {
                paths.push(gitPath)

                if (firstOnly) {
                    break
                }

                if (this.config.get(this.config.key.advancedIncludeSubmodules)) {
                    for (const submodulePath of await this.getSubmodules(gitPath)) {
                        if (!paths.includes(submodulePath)) {
                            paths.push(submodulePath)
                        }
                    }
                }
            }
        }

        paths.sort()

        return paths
    }

    /**
     * Gets the absolute paths of the initialized submodules nested under the
     * given repository, recursing into nested submodules.
     *
     * Uninitialized submodules (those without a checked out working tree) are
     * skipped as they hold no stashes.
     *
     * @param repositoryPath the absolute path of the parent repository
     */
    private async getSubmodules(repositoryPath: string): Promise<string[]> {
        const params = [
            'submodule',
            'status',
            '--recursive',
        ]

        let output: string
        try {
            output = (await this.exec(params, repositoryPath).promise).out
        }
        catch {
            // A failure here (e.g. old git, no .gitmodules) shouldn't break the
            // repository listing; just report no submodules.
            return []
        }

        const submodulePaths: string[] = []
        for (const line of output.split(/\r?\n/)) {
            // Each line looks like: " <sha> <path> (<describe>)" where the
            // leading char is a status flag: ' ' ok, '+' different commit,
            // 'U' merge conflicts, '-' not initialized.
            const tokens = /^(.)[0-9a-f]+ (.+)$/.exec(line)
            if (!tokens || tokens[1] === '-') {
                continue
            }

            // The path is relative to the superproject and may be followed by a
            // parenthesized describe value, which we strip off.
            const relativePath = tokens[2].replace(/ \(.*\)$/, '')
            submodulePaths.push(Uri.file(path.join(repositoryPath, relativePath)).fsPath)
        }

        return submodulePaths
    }
}
