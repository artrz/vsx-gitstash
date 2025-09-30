/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as Workspace from '../Workspace'
import Config from '../Config'
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
            let gitPath = (await this.exec(params, cwd).promise).out.trim()
            if (gitPath.length < 1) {
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
