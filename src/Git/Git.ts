/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { Execution as BaseExecution, ExeResult as BaseExeResult, exec } from '../Foundation/Executor'

export type ExeResult = BaseExeResult
export type Execution = BaseExecution

export default class Git {
    /**
     * Generates an execution object containing the execution promise and the command
     * / arguments.
     * used.
     */
    public exec(
        args: string[],
        cwd: string,
        callback?: (r: ExeResult) => void,
        env?: Record<string, unknown>,
        encoding?: BufferEncoding,
    ): Execution {
        const ex = exec('git', args, cwd, env, encoding)
        if (callback) {
            ex.promise = ex.promise.then((result) => {
                callback(result)
                return result
            })
        }
        return ex
    }
}
