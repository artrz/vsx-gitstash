/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { Disposable, Uri, WorkspaceFolder, WorkspaceFoldersChangeEvent, window } from 'vscode'
import { FSWatcher, existsSync, readFileSync, statSync, watch } from 'fs'
import { isAbsolute, join, resolve } from 'path'

type CallbackFunction = (event: Uri) => void

// https://github.com/Microsoft/vscode/issues/3025
export default class implements Disposable {
    private callback: CallbackFunction
    private watchers: Map<string, FSWatcher> = new Map() as Map<string, FSWatcher>

    /**
     * Creates a new watcher.
     *
     * @param repos    the repositories to watch
     * @param callback the callback to run when detecting changes
     */
    constructor(repos: string[], callback: CallbackFunction) {
        this.callback = callback
        repos.forEach((directory) => { this.registerProjectWatcher(directory) })
    }

    /**
     * Adds or removes listeners according the workspace directory changes.
     *
     * @param directoryChanges the workspace directory changes description
     */
    public configure(directoryChanges: WorkspaceFoldersChangeEvent): void {
        directoryChanges.added.forEach((changedDirectory: WorkspaceFolder) => {
            const directory = changedDirectory.uri.fsPath
            this.registerProjectWatcher(directory)
        })

        directoryChanges.removed.forEach((changedDirectory: WorkspaceFolder) => {
            const directory = changedDirectory.uri.fsPath
            this.removeProjectWatcher(directory)
        })
    }

    /**
     * Disposes this object.
     */
    public dispose(): void {
        for (const path of this.watchers.keys()) {
            this.removeProjectWatcher(path)
        }
    }

    /**
     * Registers a new project directory watcher.
     *
     * @param projectPath the directory path
     */
    private registerProjectWatcher(projectPath: string): void {
        global.dbg(`[FSWatch] Watch ${projectPath} ...`)
        if (this.watchers.has(projectPath)) {
            return
        }

        const pathToMonitor = this.resolveRefsDir(projectPath)

        if (!pathToMonitor) {
            return
        }

        try {
            const watcher = watch(pathToMonitor, (event: string, filename) => {
                if (filename?.includes('stash')) {
                    this.callback(Uri.file(projectPath))
                }
            })

            this.watchers.set(projectPath, watcher)
        }
        catch (error) {
            console.error(error)
            void window.showErrorMessage(`Unable to a create a stashes monitor for
            ${projectPath}. This may happen on NFS or if the path is a link`)
        }
    }

    /**
     * Resolves the `refs` directory to monitor for the given repository.
     *
     * For a regular repository this is `<project>/.git/refs`. For submodules
     * and linked worktrees `.git` is a file pointing to the real git directory
     * (`gitdir: <path>`), so the refs live under that resolved directory
     * instead.
     *
     * @param projectPath the repository working directory
     */
    private resolveRefsDir(projectPath: string): string | undefined {
        const dotGit = join(projectPath, '.git')

        if (!existsSync(dotGit)) {
            return undefined
        }

        let gitDir = dotGit
        if (statSync(dotGit).isFile()) {
            const match = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, 'utf8'))
            if (!match) {
                return undefined
            }
            const target = match[1].trim()
            gitDir = isAbsolute(target) ? target : resolve(projectPath, target)
        }

        const refsDir = join(gitDir, 'refs')

        return existsSync(refsDir) ? refsDir : undefined
    }

    /**
     * Removes an active project directory watcher.
     *
     * @param path the directory path
     */
    private removeProjectWatcher(path: string): void {
        if (this.watchers.has(path)) {
            global.dbg(`[FSWatch] Stop watching ${path} ...`)
            this.watchers.get(path)?.close()
            this.watchers.delete(path)
        }
    }
}
