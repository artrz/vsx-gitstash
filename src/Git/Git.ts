/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { Execution as BaseExecution, ExeResult as BaseExeResult, exec } from '../Foundation/Executor'

export type Execution = BaseExecution
export type ExeResult = BaseExeResult

export default class Git {
    /**
     * @param callback this will be executed every time exec() gets called.
        Do not blindly resolve the promise or the execution lifecycle may break!
     */
    constructor(
        protected callback?: (exec: Execution) => void,
    ) { }

    /**
     * Generates an execution object containing the execution promise and the command
     * / arguments.
     * used.
     */
    public exec(
        args: string[],
        cwd?: string,
        env?: Record<string, string | undefined>,
        encoding?: BufferEncoding,
    ): Execution {
        const ex = exec('git', args, cwd, env, encoding)
        if (this.callback) { this.callback(ex) }
        return ex
    }

    /**
     * Gets the current git (semver) version.
     */
    public async version(): Promise<string> {
        const params = [
            'version',
        ]

        const versionString = (await this.exec(params).promise).out.trim()
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tokens = /.+ (\d+\.\d+\.\d+).*/.exec(versionString)!
        return tokens[1]
    }
}
