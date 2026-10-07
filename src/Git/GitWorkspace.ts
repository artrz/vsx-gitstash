/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as Workspace from '../Workspace'
import Config from '../Config'
import ExecError from '../Foundation/ExecError'
import Git, { Execution } from './Git'
import GitRepositorySelection from './GitRepositorySelection'
import { Uri } from 'vscode'

export default class GitWorkspace extends Git {
    constructor(
        private config: Config,
        protected callback?: (exec: Execution) => void,
        private gitRepositorySelection?: GitRepositorySelection,
    ) {
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

        const paths = this.gitRepositorySelection?.getRepositoryPaths() ?? []
        if (firstOnly && paths.length) {
            return paths.slice(0, 1)
        }

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
            }
        }

        paths.sort()

        return paths
    }
}
