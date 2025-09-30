/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as vscode from 'vscode'
import GitStash, { FileStage } from '../Git/GitStash'
import FileNodeType from '../StashNode/FileNodeType'

export default class implements vscode.TextDocumentContentProvider {
    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>()

    constructor(
        private gitStash: GitStash,
    ) { }

    /**
     * @see vscode.TextDocumentContentProvider.provideTextDocumentContent
     */
    public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const params = uri.query.split('&').reduce<Record<string, string>>((data, kv) => {
            const [key, value] = kv.split('=')
            data[key] = value
            return data
        }, {})

        const cwd = params.cwd
        const index = parseInt(params.index, 10)
        const path = params.path
        const oldPath = params.oldPath
        const type = params.type as FileNodeType
        const side = params.side as FileStage

        if (!cwd || !path || index < 0) {
            console.error(`cwd: ${cwd}, path: ${path}, index: ${index}`)
            return ''
        }

        let contents = ''

        try {
            if (type === FileNodeType.Added) {
                contents = (await this.gitStash.getStashContents(cwd, index, path)).out
            }
            else if (type === FileNodeType.Deleted) {
                contents = (await this.gitStash.getParentContents(cwd, index, path)).out
            }
            else if (type === FileNodeType.Modified) {
                contents = side === FileStage.Parent
                    ? (await this.gitStash.getParentContents(cwd, index, path)).out
                    : (await this.gitStash.getStashContents(cwd, index, path)).out
            }
            else if (type === FileNodeType.Renamed) {
                contents = side === FileStage.Parent
                    ? (await this.gitStash.getParentContents(cwd, index, oldPath)).out
                    : (await this.gitStash.getStashContents(cwd, index, path)).out
            }
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            else if (type === FileNodeType.Untracked) {
                contents = (await this.gitStash.getThirdParentContents(cwd, index, path)).out
            }
            else {
                console.warn(`provideTextDocumentContent type[${params.type}] side[${side}]`)
                console.warn(uri.query)
            }
        }
        catch (e) {
            console.log(`provideTextDocumentContent type[${type}] side[${side}]`)
            console.log(uri.query)
            console.error(e)
            throw e
        }

        return contents
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEmitter.event
    }

    public update(uri: vscode.Uri): void {
        this.onDidChangeEmitter.fire(uri)
    }
}
