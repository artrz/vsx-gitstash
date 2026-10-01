/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as Workspace from '../Workspace'
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

                if (error.stderr.includes('dubious ownership')) {
                    try {
                        const safeParams = ['-c', `safe.directory=${cwd}`, ...params]
                        gitPath = (await this.exec(safeParams, cwd).promise).out.trim()
                        if (gitPath) {
                            Git.addSafeDirectoryPath(Uri.file(gitPath).fsPath)
                        }
                        global.dbg(`[repo] Dubious ownership detected for '${cwd}', resolved with safe.directory`)
                    }
                    catch { /* still not a valid repo, skip */ }
                }
                // else: not a git repository, skip
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
