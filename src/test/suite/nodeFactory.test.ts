import * as assert from 'assert'
import { Uri, WorkspaceFolder } from 'vscode'

import { getWorkspaceFolderLabel } from '../../StashNode/NodeFactory'

suite('Node Factory Test Suite', () => {
    test('Uses the directory name for a nested repository', () => {
        const workspaceFolder: WorkspaceFolder = {
            uri: Uri.file('/tmp/bot'),
            name: 'bot',
            index: 0,
        }

        assert.strictEqual(
            getWorkspaceFolderLabel('/tmp/bot/cadence-shift', workspaceFolder),
            undefined,
        )
        assert.strictEqual(getWorkspaceFolderLabel('/tmp/bot', workspaceFolder), 'bot')
    })
})
