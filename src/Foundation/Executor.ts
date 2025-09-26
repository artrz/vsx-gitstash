/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import ExecError from './ExecError'
import { spawn } from 'child_process'

/**
 * An Execution Result, containing the output, the error output, and the execution time.
 */
export class ExeResult {
    constructor(
        public output: string | undefined,
        public err: string | undefined,
        public time: number,
    ) {
    }

    get out() { return `${this.output}${this.err}` }
}

/**
 * An Execution, containing the execution promise and the command arguments used.
 */
export class Execution {
    promise!: Promise<string>
    args!: string[]
}

export default class {
    /**
     * Executes a command.
     *
     * @param args     the string array with the command and argument list
     * @param cwd      the string with the current working directory
     * @param env      A dictionary with environment variables
     * @param encoding the BufferEncoding string with the optional encoding to replace utf8
     */
    protected call(
        command: string,
        args: string[],
        cwd?: string,
        env?: Record<string, unknown>,
        encoding?: BufferEncoding,
    ): Promise<ExeResult> {
        const outBuffer: Buffer[] = []
        const errBuffer: Buffer[] = []
        let error: Error | undefined
        env ??= {}

        const startTime = performance.now()
        const cmd = spawn(command, args, { cwd, env: env as NodeJS.ProcessEnv })

        return new Promise<ExeResult>((resolve, reject) => {
            cmd.stdout.on('data', (chunk: Buffer) => outBuffer.push(chunk))
            cmd.stderr.on('data', (chunk: Buffer) => errBuffer.push(chunk))
            cmd.once('error', (err: Error) => error = err)
            cmd.on('close', (code: number) => {
                cmd.removeAllListeners()

                if (error) {
                    reject(new ExecError(code, error.message))
                    return
                }

                const result = Buffer.concat(outBuffer).toString(encoding ?? 'utf8')
                const errResult = Buffer.concat(errBuffer).toString(encoding ?? 'utf8')

                if (process.env.EXT_DEBUG === '1') {
                    console.log(`${new Date().toISOString()} > ${command} ${args.join(' ')} [${Math.round(performance.now() - startTime)}ms]`)
                }

                if (code === 0) {
                    resolve(new ExeResult(
                        result,
                        errResult,
                        Math.round(performance.now() - startTime),
                    ))
                }
                else {
                    reject(new ExecError(code, errResult, result))
                }
            })
        })
    }

    /**
     * Generates an execution object containing the execution promise and the arguments
     * used.
     */
    protected callObj(
        command: string,
        args: string[],
        cwd?: string,
        env?: Record<string, unknown>,
        encoding?: BufferEncoding,
    ): Execution {
        return {
            promise: this.call(command, args, cwd, env, encoding).then((res) => `${res.output}${res.err}`),
            args,
        }
    }
}
