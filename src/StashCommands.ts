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
import StashLabels from './StashLabels'
import StashNode from './StashNode/StashNode'
import WorkspaceGit from './Git/WorkspaceGit'
import { Execution } from './Git/Git'
import { toDateTimeIso } from './DateFormat'

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

    private config: Config
    private workspaceGit: WorkspaceGit
    private channel: vscode.OutputChannel
    private stashGit: StashGit
    private branchGit: BranchGit
    private stashLabels: StashLabels

    constructor(config: Config, workspaceGit: WorkspaceGit, channel: vscode.OutputChannel, stashLabels: StashLabels) {
        this.config = config
        this.workspaceGit = workspaceGit
        this.channel = channel
        this.stashLabels = stashLabels
        this.stashGit = new StashGit()
        this.branchGit = new BranchGit()
    }

    /**
     * Generates a stash.
     */
    public async stash(
        repositoryNode: RepositoryNode,
        type: StashType,
        message?: string,
    ): Promise<void> {
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
        await this.handleExecution(repositoryNode, exec, 'Stash stored')
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
        void this.handleExecution(node, exec, 'Stash popped')
    }

    /**
     * Applies a stash.
     */
    public apply(stashNode: StashNode, withIndex: boolean): void {
        const exec = this.stashGit.apply(stashNode.path, stashNode.index, withIndex)
        void this.handleExecution(stashNode, exec, 'Stash applied')
    }

    /**
     * Branches a stash.
     */
    public branch(stashNode: StashNode, name: string): void {
        const exec = this.stashGit.branch(stashNode.path, stashNode.index, name)
        void this.handleExecution(stashNode, exec, 'Stash branched')
    }

    /**
     * Drops a stash.
     */
    public drop(stashNode: StashNode): void {
        const exec = this.stashGit.drop(stashNode.path, stashNode.index)
        void this.handleExecution(stashNode, exec, 'Stash dropped')
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
        void this.handleExecution(fileNode, exec, 'Changes from file applied')
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
        void this.handleExecution(fileNode, exec, 'File created')
    }

    /**
     * Removes the stashes list.
     */
    public clear(repositoryNode: RepositoryNode): void {
        const exec = this.stashGit.clear(repositoryNode.path)
        void this.handleExecution(repositoryNode, exec, 'Stash list cleared')
    }

    /**
     * Checkouts a branch.
     */
    public async checkout(repositoryNode: RepositoryNode, branch: string): Promise<void> {
        const exec = this.branchGit.checkout(repositoryNode.path, branch)
        await this.handleExecution(repositoryNode, exec, `Switched to branch ${branch}`)
    }

    /**
     * Verifies current state doesn't have any unmerged paths (merge conflicts).
     */
    private async noMergeConflicts(cwd: string): Promise<boolean | undefined> {
        const exec = this.stashGit.statusP2(cwd)
        try {
            const output = (await exec.promise).out
            return undefined !== output
                .split('\0')
                .find((entry) => entry.startsWith('u'))
        }
        catch (error) {
            console.error('StashCommands.noMergeConflicts()')
            console.error(error)
            return undefined
        }
    }

    private async handleExecution(
        node: RepositoryNode | StashNode | FileNode,
        exec: Execution,
        msg: string,
    ): Promise<boolean> {
        try {
            const output = (await exec.promise).out
            this.inform(node, exec.args, output, msg)
            return true
        }
        catch (error) {
            this.informError(node, exec.args, error)
            return false
        }
    }

    /**
     * Logs the command to the extension channel.
     *
     * @param node             the optional involved node
     * @param params           the git command params
     * @param result           the result content
     * @param notificationText the optional notification message
     * @param type             the message type
     */
    private inform(
        node: RepositoryNode | StashNode | FileNode,
        params: string[],
        result: string,
        notificationText: string,
        type: NotificationType = NotificationType.Message,
    ): void {
        this.log(node, params, result, type)

        if (type !== NotificationType.Message || this.config.get<boolean>('notifications.success.show')) {
            this.notify(notificationText, type)
        }
    }

    private informError(
        node: RepositoryNode | StashNode | FileNode,
        params: string[],
        error: unknown,
    ) {
        console.error('StashCommands.informError()')
        console.error(error)
        console.error('---------')

        if (error instanceof Error) {
            const result = error.message
            this.inform(node, params, result, result, NotificationType.Error)
        }
        else {
            let result = 'Unknown error'
            try { result = JSON.stringify(error) }
            catch { /* empty */ }
            const excerpt = 'An unexpected error happened. See the console for details.'
            this.inform(node, params, result, excerpt, NotificationType.Error)
        }
    }

    /**
     * Logs the command to the extension channel.
     *
     * @param node   the source node
     * @param params the git command params
     * @param result the string result message
     * @param type   the string message type
     */
    private log(
        node: RepositoryNode | StashNode | FileNode,
        params: string[],
        result: string,
        type: NotificationType,
    ): void {
        if (this.config.get<boolean>('log.autoclear')) {
            this.channel.clear()
        }

        const currentTime = toDateTimeIso(new Date())
        const cwd = node instanceof FileNode ? node.parent.path : node.path
        const cmd = `git ${params.join(' ')}`
        const tp = type === NotificationType.Message ? 'info' : type as string

        this.channel.appendLine(`${currentTime} [${tp}]`)
        this.channel.appendLine(` └ ${cwd} (${this.stashLabels.getName(node)})`)
        this.channel.appendLine(`   ${cmd}`)
        this.channel.appendLine(`${result}\n\n`)
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
