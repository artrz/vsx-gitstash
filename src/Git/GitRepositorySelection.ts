/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { Disposable, Event, extensions, Uri } from 'vscode'

/** The portion of the public Git extension API used to track SCM selection. */
export interface GitRepository {
    readonly rootUri: Uri
    readonly ui: {
        readonly selected: boolean
        readonly onDidChange: Event<void>
    }
}

export interface GitApi {
    readonly repositories: GitRepository[]
    readonly onDidOpenRepository: Event<GitRepository>
    readonly onDidCloseRepository: Event<GitRepository>
}

interface GitExtension {
    readonly enabled: boolean
    getAPI(version: 1): GitApi
}

/**
 * Tracks the repositories selected in VS Code's Source Control view.
 *
 * The Git extension is optional, so callers must retain their normal fallback
 * when an API instance cannot be acquired.
 */
export default class GitRepositorySelection implements Disposable {
    private readonly repositoryListeners = new Map<GitRepository, Disposable>()
    private readonly selectedRepositoryPaths = new Set<string>()
    private readonly subscriptions: Disposable[]

    public constructor(private readonly api: GitApi) {
        api.repositories.forEach((repository) => { this.addRepository(repository) })
        this.subscriptions = [
            api.onDidOpenRepository((repository) => { this.addRepository(repository) }),
            api.onDidCloseRepository((repository) => { this.removeRepository(repository) }),
        ]
    }

    /**
     * Gets the selection tracker if the built-in Git extension is available.
     */
    public static async create(): Promise<GitRepositorySelection | undefined> {
        const extension = extensions.getExtension<GitExtension>('vscode.git')
        if (!extension) { return }

        try {
            const gitExtension = await extension.activate()
            return gitExtension.enabled
                ? new GitRepositorySelection(gitExtension.getAPI(1))
                : undefined
        }
        catch {
            // Git is optional. Commands retain their editor and picker fallbacks.
            return undefined
        }
    }

    /**
     * Indicates whether the repository root is currently selected in Source Control.
     */
    public isSelected(repositoryPath: string): boolean {
        return this.selectedRepositoryPaths.has(repositoryPath)
    }

    /**
     * Gets the root paths for all repositories known to VS Code's Git extension.
     */
    public getRepositoryPaths(): string[] {
        return Array.from(this.repositoryListeners.keys(), (repository) => repository.rootUri.fsPath)
    }

    public dispose(): void {
        this.subscriptions.forEach((subscription) => { void subscription.dispose() })
        this.repositoryListeners.forEach((subscription) => { void subscription.dispose() })
        this.repositoryListeners.clear()
        this.selectedRepositoryPaths.clear()
    }

    private addRepository(repository: GitRepository): void {
        if (this.repositoryListeners.has(repository)) { return }

        this.repositoryListeners.set(
            repository,
            repository.ui.onDidChange(() => { this.updateSelection(repository) }),
        )
        this.updateSelection(repository)
    }

    private removeRepository(repository: GitRepository): void {
        this.repositoryListeners.get(repository)?.dispose()
        this.repositoryListeners.delete(repository)
        this.selectedRepositoryPaths.delete(repository.rootUri.fsPath)
    }

    private updateSelection(repository: GitRepository): void {
        const path = repository.rootUri.fsPath
        if (repository.ui.selected) {
            this.selectedRepositoryPaths.add(path)
        }
        else {
            this.selectedRepositoryPaths.delete(path)
        }
    }
}
