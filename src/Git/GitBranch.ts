/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import Git, { Execution } from './Git'

export default class GitBranch extends Git {
    constructor(protected callback?: (exec: Execution) => void) {
        super(callback)
    }

    /**
     * Gets the branches.
     */
    public getBranches(cwd: string): Promise<string[]> {
        const params = [
            'for-each-ref',
            '--format=%(refname)',
            'refs/heads/',
        ]

        return this.exec(params, cwd).promise.then((result) =>
            result.out
                .replaceAll('refs/heads/', '')
                .trim()
                .split(/\r?\n/g),
        )
    }

    /**
     * Gets the current branch.
     */
    public currentBranch(cwd: string): Promise<string> {
        const params = [
            'rev-parse',
            '--abbrev-ref',
            'HEAD',
        ]

        return this.exec(params, cwd).promise.then((result) => result.out.trim())
    }

    /**
     * Checkouts a branch.
     */
    public checkout(cwd: string, branch: string): Execution {
        const params = [
            'checkout',
            branch,
        ]

        return this.exec(params, cwd)
    }
}
