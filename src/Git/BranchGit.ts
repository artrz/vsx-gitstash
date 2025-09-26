/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import Git, { Execution } from './Git'

export default class BranchGit extends Git {
    /**
     * Gets the branches.
     */
    public getBranches(cwd: string): Execution {
        const params = [
            'for-each-ref',
            '--format=%(refname)',
            'refs/heads/',
        ]

        return this.exec(params, cwd, (result) => {
            result.stdout = result.stdout?.replaceAll('refs/heads/', '').trim()
        })
    }

    /**
     * Gets the current branch.
     */
    public currentBranch(cwd: string): Execution {
        const params = [
            'rev-parse',
            '--abbrev-ref',
            'HEAD',
        ]

        return this.exec(params, cwd, (result) => {
            result.stdout = result.stdout?.trim()
        })
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
