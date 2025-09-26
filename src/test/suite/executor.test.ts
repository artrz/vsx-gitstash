import * as assert from 'assert'

import { exec } from '../../Foundation/Executor'
import Git from '../../Git/Git'

suite('Executor Test Suite', () => {
    const git = new Git()

    test('Successful exec test', async () => {
        const echoText = 'hello world\nfoo\n'
        const result = await exec('echo', ['-n', echoText]).promise
        assert.strictEqual(echoText, result.out)
    })

    test('Failing exec test', async () => {
        let error = undefined
        try { await exec('wrong-command-called', ['foo']).promise }
        catch (err) { error = err }
        assert.strictEqual(error instanceof Error, true)
    })

    test('Successful git call', async () => {
        const result = (await git.exec(['stash', 'list'], '.').promise).out
        assert.strictEqual(typeof result === 'string', true)
        // console.log(result)
    })
})
