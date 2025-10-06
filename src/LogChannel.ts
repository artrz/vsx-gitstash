/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { OutputChannel, window } from 'vscode'
import { toDateTimeIso } from './DateFormat'
import { ExeResult } from './Git/Git'

export class LogChannel {
    private channel: OutputChannel

    constructor(channelName: string) {
        this.channel = window.createOutputChannel(channelName)
    }

    public logExeResult(args: string[], exeResult: ExeResult) {
        const currentTime = toDateTimeIso(new Date(), false, true)
        const cmd = `git ${args.join(' ')}`

        this.appendLine(`${currentTime} > ${cmd} [${exeResult.time}ms]`)
        // this.appendLine(exeResult.out)
    }

    public logExeError(args: string[], error: unknown) {
        const currentTime = toDateTimeIso(new Date(), false, true)
        const cmd = `git ${args.join(' ')}`

        const err = error instanceof Error ? error.message : JSON.stringify(error)

        this.appendLine(`${currentTime} > ${cmd}`)
        this.appendLine(err)
    }

    public appendLine(value: string): void { this.channel.appendLine(value) }
    public clear(): void { this.channel.clear() }
    public show(preserveFocus?: boolean): void { this.channel.show(preserveFocus) }
}
