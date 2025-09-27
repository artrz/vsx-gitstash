/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as vscode from 'vscode'
import BranchGit from './Git/BranchGit'
import Config from './Config'
import FileNode from './StashNode/FileNode'
import RepositoryNode from './StashNode/RepositoryNode'
import StashGit from './Git/StashGit'
import StashNode from './StashNode/StashNode'
import WorkspaceGit from './Git/WorkspaceGit'
import { Execution } from './Git/Git'
import { LogChannel } from './LogChannel'

enum StashType {
    Simple,
    Staged,
    KeepIndex,
    IncludeUntracked,
    IncludeUntrackedKeepIndex,
    All,
    AllKeepIndex,
}

enum NotificationType {
    Warning = 'warning',
    Message = 'message',
    Error = 'error',
}

export class StashCommands {
    static StashType = StashType

    constructor(
        private config: Config,
        private workspaceGit: WorkspaceGit,
        private stashGit: StashGit,
        private branchGit: BranchGit,
        private channel: LogChannel,
    ) { }

    /**
     * Generates a stash.
     */
    public stash(
        repositoryNode: RepositoryNode,
        type: StashType,
        message?: string,
    ): void {
        const params = []

        switch (type) {
            case StashType.Staged:
                params.push('--staged') // requires git v2.35
                break
            case StashType.KeepIndex:
                params.push('--keep-index')
                break
            case StashType.IncludeUntracked:
                params.push('--include-untracked')
                break
            case StashType.IncludeUntrackedKeepIndex:
                params.push('--include-untracked')
                params.push('--keep-index')
                break
            case StashType.All:
                params.push('--all')
                break
            case StashType.AllKeepIndex:
                params.push('--all')
                params.push('--keep-index')
                break
        }

        const exec = this.stashGit.stash(repositoryNode.path, params, message)
        this.handleExecution(repositoryNode, exec, 'Stash stored')
    }

    /**
     * Creates stashes for the given files across multiple repositories.
     *
     * @param filePaths an array with the list of the file paths to stash
     * @param message   an optional message to set on the stash
     */
    public async push(filePaths: string[], message?: string): Promise<void> {
        const paths: (string | null)[] = filePaths
        const repositoryPaths = await this.workspaceGit.getRepositories()

        const repositories: Record<string, string[]> = repositoryPaths
            .sort()
            // Reverse so longer paths go first.
            .reverse()
            .reduce((repositories: Record<string, string[]>, repoPath: string) => {
                // Add container for each repo path containing every file whose path
                // contains the the current repo path.
                if (!(repoPath in repositories)) {
                    repositories[repoPath] = []
                }
                for (let i = 0; i < paths.length; i += 1) {
                    const filePath = paths[i]
                    if (filePath?.startsWith(repoPath)) {
                        repositories[repoPath].push(filePath)
                        // Remove the file so its not processed on next iterations.
                        paths[i] = null
                    }
                }
                return repositories
            }, {})

        Object.entries(repositories).forEach(([repoPath, files]) => {
            if (files.length) {
                const exec = this.stashGit.push(repoPath, files, message)
                void exec.promise.then((res) => {
                    console.log('=> push() selected files')
                    console.log(exec.args)
                    console.log(res)
                })
            }
        })
    }

    /**
     * Pops a stash.
     */
    public pop(node: RepositoryNode | StashNode, withIndex: boolean): void {
        const index = node instanceof RepositoryNode ? 0 : node.index
        const exec = this.stashGit.pop(node.path, index, withIndex)
        this.handleExecution(node, exec, 'Stash popped')
    }

    /**
     * Applies a stash.
     */
    public apply(stashNode: StashNode, withIndex: boolean): void {
        const exec = this.stashGit.apply(stashNode.path, stashNode.index, withIndex)
        this.handleExecution(stashNode, exec, 'Stash applied')
    }

    /**
     * Branches a stash.
     */
    public branch(stashNode: StashNode, name: string): void {
        const exec = this.stashGit.branch(stashNode.path, stashNode.index, name)
        this.handleExecution(stashNode, exec, 'Stash branched')
    }

    /**
     * Drops a stash.
     */
    public drop(stashNode: StashNode): void {
        const exec = this.stashGit.drop(stashNode.path, stashNode.index)
        this.handleExecution(stashNode, exec, 'Stash dropped')
    }

    /**
     * Applies changes from a file.
     */
    public applySingle(fileNode: FileNode): void {
        const exec = this.stashGit.applySingle(
            fileNode.parent.path,
            fileNode.parent.index,
            fileNode.relativePath,
        )
        this.handleExecution(fileNode, exec, 'Changes from file applied')
    }

    /**
     * Applies changes from a file.
     */
    public createSingle(fileNode: FileNode): void {
        const exec = this.stashGit.createSingle(
            fileNode.parent.path,
            fileNode.parent.index,
            fileNode.relativePath,
        )
        this.handleExecution(fileNode, exec, 'File created')
    }

    /**
     * Removes the stashes list.
     */
    public clear(repositoryNode: RepositoryNode): void {
        const exec = this.stashGit.clear(repositoryNode.path)
        this.handleExecution(repositoryNode, exec, 'Stash list cleared')
    }

    /**
     * Checkouts a branch.
     */
    public checkout(repositoryNode: RepositoryNode, branch: string): void {
        const exec = this.branchGit.checkout(repositoryNode.path, branch)
        this.handleExecution(repositoryNode, exec, `Switched to branch ${branch}`)
    }

    private handleExecution(
        node: RepositoryNode | StashNode | FileNode,
        exec: Execution,
        msg: string,
    ): void {
        exec.promise.then((exeResult) => {
            this.channel.appendLine(`  └ context: ${node.path}`)
            this.channel.appendLine(exeResult.out)

            if (this.config.get<boolean>('notifications.success.show')) {
                this.notify(msg, NotificationType.Message)
            }
        }).catch((error: unknown) => {
            console.error('StashCommands.informError()')
            console.error(error)
            console.error('---')

            const msg = error instanceof Error
                ? error.message
                : 'An unexpected error occurred. See the console for details. (err1)'

            this.notify(msg, NotificationType.Error)
        })
    }

    /**
     * Shows a notification with the given summary message.
     *
     * @param information the text to be displayed
     * @param type        the the message type
     */
    private notify(information: string, type: string) {
        const summary = information.substring(0, 300)

        const actions = [{ title: 'Show log' }]
        const callback = (value: unknown) => {
            if (typeof value !== 'undefined') {
                this.channel.show(true)
            }
        }

        if (type === 'warning') {
            void vscode.window.showWarningMessage(summary, ...actions).then(callback)
        }
        else if (type === 'error') {
            void vscode.window.showErrorMessage(summary, ...actions).then(callback)
        }
        else {
            void vscode.window.showInformationMessage(summary, ...actions).then(callback)
        }
    }
}
