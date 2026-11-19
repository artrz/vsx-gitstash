import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

interface SettingsSchema {
    type: string | string[]
    items?: { type: string }
    default?: unknown
}

interface PackageJson {
    contributes: {
        configuration: {
            properties: Record<string, SettingsSchema>
        }
    }
}

const VALID_SCHEMA_TYPES = new Set([
    'string', 'number', 'integer', 'boolean', 'array', 'object', 'null',
])

function readPackageJson(): PackageJson {
    let dir: string = process.cwd()
    for (let i = 0; i < 5; i++) {
        const candidate: string = path.resolve(dir, 'package.json')
        if (fs.existsSync(candidate)) {
            const raw: string = fs.readFileSync(candidate, 'utf-8')
            return JSON.parse(raw) as PackageJson
        }
        dir = path.dirname(dir)
    }
    assert.fail('Could not locate package.json')
}

suite('Package configuration schema Test Suite', () => {
    test('contributed settings use valid JSON Schema types', () => {
        const properties = readPackageJson().contributes.configuration.properties

        for (const [key, schema] of Object.entries(properties)) {
            const types: string[] = Array.isArray(schema.type) ? schema.type : [schema.type]
            for (const type of types) {
                assert.ok(
                    VALID_SCHEMA_TYPES.has(type),
                    `Setting "${key}" has invalid schema type "${type}"`,
                )
            }
            if (schema.type === 'array') {
                assert.ok(
                    schema.items !== undefined,
                    `Setting "${key}" is an array but is missing "items"`,
                )
            }
        }
    })

    test('ignoredDirectories is a string array', () => {
        const schema = readPackageJson().contributes.configuration.properties['gitstash.advanced.ignoredDirectories']

        assert.strictEqual(schema.type, 'array')
        assert.strictEqual(schema.items?.type, 'string')
        assert.ok(Array.isArray(schema.default))
        assert.ok(schema.default.every((entry: unknown) => typeof entry === 'string'))
    })
})
