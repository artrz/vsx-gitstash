/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import ExecError from './ExecError'
import { spawn } from 'child_process'

/**
 * An Execution, containing the execution promise and the command arguments used.
 */
export class Execution {
    args!: string[]
    promise!: Promise<ExeResult>
}

/**
 * An Execution Result, containing the output and the error output.
 */
export class ExeResult {
    constructor(
        public stdout: string | undefined,
        public stderr: string | undefined,
        /** Execution time (ms). */
        public time: number,
    ) {
    }

    get out() { return `${this.stdout}${this.stderr}` }
}

/**
 * Executes a command.
 *
 * @param args     the string array with the command and argument list
 * @param cwd      the string with the current working directory
 * @param env      A dictionary with environment variables
 * @param encoding the BufferEncoding string with the optional encoding to replace utf8
 */
export function exec(
    command: string,
    args: string[],
    cwd?: string,
    env?: Record<string, unknown>,
    encoding?: BufferEncoding,
): Execution {
    const outBuffer: Buffer[] = []
    const errBuffer: Buffer[] = []
    let error: Error | undefined
    env ??= {}
    encoding ??= 'utf8'

    const startTime = performance.now()
    const cmd = spawn(command, args, { cwd, env: env as NodeJS.ProcessEnv })

    return {
        args,
        promise: new Promise<ExeResult>((resolve, reject) => {
            cmd.stdout.on('data', (chunk: Buffer) => outBuffer.push(chunk))
            cmd.stderr.on('data', (chunk: Buffer) => errBuffer.push(chunk))
            cmd.once('error', (err: Error) => error = err)
            cmd.on('close', (code: number) => {
                cmd.removeAllListeners()

                if (error) {
                    reject(new ExecError(code, error.message))
                    return
                }

                const result = Buffer.concat(outBuffer).toString(encoding)
                const errResult = Buffer.concat(errBuffer).toString(encoding)

                if (process.env.EXT_DEBUG === '1') {
                    console.log(`${new Date().toISOString()} > ${command} ${args.join(' ')} [${Math.round(performance.now() - startTime)}ms]`)
                }

                if (code === 0) {
                    resolve(new ExeResult(
                        result, errResult, Math.round(performance.now() - startTime),
                    ))
                }
                else {
                    reject(new ExecError(code, errResult, result))
                }
            })
        }),
    }
}
