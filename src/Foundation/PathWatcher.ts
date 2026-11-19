/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { FSWatcher, WatchListener, watch } from 'fs'

/**
 * The callback used on PathWatcher events.
 */
export type WatcherCallback = WatchListener<string>

/**
 * A class wrapping a FSWatcher adding a path property to identify the watched directory.
 */
export class PathWatcher {
    protected constructor(
        public path: string,
        public watcher: FSWatcher,
    ) { }

    /**
     * Creates a watcher for the given file.
     */
    public static watch(path: string, callback: WatcherCallback) {
        return new PathWatcher(path, watch(path, (event, filename) => {
            callback(event, filename)
        }))
    }

    /**
     * Indicates if the watcher if for the specified path.
     */
    public for(path: string): boolean {
        return this.path === path
    }

    /**
     * Disposes the watcher by removing every listener and closing it.
     */
    public dispose(): void {
        this.watcher.removeAllListeners().close()
    }
}
