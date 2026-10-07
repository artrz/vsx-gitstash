import * as assert from 'assert'
import { EventEmitter, Uri } from 'vscode'

import GitRepositorySelection, { GitApi, GitRepository } from '../../Git/GitRepositorySelection'

suite('Git Repository Selection Test Suite', () => {
    test('Tracks repositories selected in Source Control', () => {
        const selectionChanged = new EventEmitter<void>()
        const repositoryOpened = new EventEmitter<GitRepository>()
        const repositoryClosed = new EventEmitter<GitRepository>()
        let selected = false
        const repository: GitRepository = {
            rootUri: Uri.file('/tmp/gitstash-selected-repository'),
            ui: {
                get selected() { return selected },
                onDidChange: selectionChanged.event,
            },
        }
        const api: GitApi = {
            repositories: [repository],
            onDidOpenRepository: repositoryOpened.event,
            onDidCloseRepository: repositoryClosed.event,
        }
        const tracker = new GitRepositorySelection(api)

        assert.strictEqual(tracker.isSelected(repository.rootUri.fsPath), false)
        assert.deepStrictEqual(tracker.getRepositoryPaths(), [repository.rootUri.fsPath])

        selected = true
        selectionChanged.fire()
        assert.strictEqual(tracker.isSelected(repository.rootUri.fsPath), true)

        repositoryClosed.fire(repository)
        assert.strictEqual(tracker.isSelected(repository.rootUri.fsPath), false)
        assert.deepStrictEqual(tracker.getRepositoryPaths(), [])

        tracker.dispose()
        selectionChanged.dispose()
        repositoryOpened.dispose()
        repositoryClosed.dispose()
    })
})
