/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { Disposable, WorkspaceFolder, WorkspaceFoldersChangeEvent, window } from 'vscode'
import { existsSync, WatchEventType } from 'fs'
import { PathWatcher, WatcherCallback } from './Foundation/PathWatcher'
import { join } from 'path'

type RepoWatcherCallback = (event: WatchEventType, filename: string) => void

// https://github.com/Microsoft/vscode/issues/3025
export default class implements Disposable {
    private callback: RepoWatcherCallback
    private watchers: Map<string, PathWatcher[]> = new Map() as Map<string, PathWatcher[]>

    /**
     * Creates a new watcher.
     *
     * @param repos    the repositories to watch
     * @param callback the callback to run when detecting changes
     */
    constructor(repos: string[], callback: RepoWatcherCallback) {
        this.callback = callback
        repos.forEach((directory) => { this.registerProjectWatchers(directory) })
    }

    /**
     * Adds or removes listeners according the workspace directory changes.
     *
     * @param directoryChanges the workspace directory changes description
     */
    public configure(directoryChanges: WorkspaceFoldersChangeEvent): void {
        directoryChanges.added.forEach((changedDirectory: WorkspaceFolder) => {
            const directory = changedDirectory.uri.fsPath
            this.registerProjectWatchers(directory)
        })

        directoryChanges.removed.forEach((changedDirectory: WorkspaceFolder) => {
            const directory = changedDirectory.uri.fsPath
            this.removeProjectWatchers(directory)
        })
    }

    /**
     * Disposes this object.
     * @see Disposable.dispose()
     */
    public dispose(): void {
        for (const path of this.watchers.keys()) {
            this.removeProjectWatchers(path)
        }
    }

    /**
     * Registers the project directory watchers.
     *
     * @param projectPath the directory path
     */
    private registerProjectWatchers(projectPath: string): void {
        global.dbg(`[FSWatch] Watch ${projectPath} ...`)
        const pathToMonitor = join(projectPath, '.git', 'refs')
        if (!existsSync(pathToMonitor)) {
            return
        }

        this.registerPathWatcher(pathToMonitor, projectPath)
    }

    /**
     * Creates a FS Watcher for a directory.
     * @param pathToMonitor the path to monitor
     * @param projectPath   the path to use in the callback
     */
    private registerPathWatcher(pathToMonitor: string, projectPath: string) {
        const watchers = this.watchers.get(projectPath)
            ?? this.watchers.set(projectPath, []).get(projectPath)! // eslint-disable-line @typescript-eslint/no-non-null-assertion

        if (watchers.length && watchers.find((watcher) => watcher.for(pathToMonitor))) {
            return
        }

        try {
            // Create the watcher callback which will review if a reaction is needed
            // based on the changed (stash) file.
            const callback: WatcherCallback = (event, filename) => {
                if (filename?.includes('stash')) {
                    this.callback(event, projectPath)
                }
            }

            watchers.push(PathWatcher.watch(pathToMonitor, callback))
        }
        catch (error) {
            const msg = `Unable to create a stashes monitor for ${pathToMonitor}.`
                + ' This may happen on NFS or if the path is a link.'
                + ' See the console for details'
            console.error(msg)
            console.error(error)
            void window.showErrorMessage(msg)
        }
    }

    private removeProjectWatchers(path: string): void {
        global.dbg(`[FSWatch] Stop watching ${path} ...`)
        this.watchers.get(path)?.forEach((watcher) => { watcher.dispose() })
        this.watchers.delete(path)
    }
}
