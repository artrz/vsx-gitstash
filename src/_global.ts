/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// typeof doesn't evaluate "window", only tries to get its type.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
const _global = (typeof window !== 'undefined' ? window /* browser */ : global /* node */) as any

_global.debug = process.env.EXT_DEBUG === '1'

_global.setDebug = (state: boolean) => {
    // When setting debug mode, we always give env flag precedence.
    _global.debug = process.env.EXT_DEBUG === '1' || state
}

_global.dbg = (...args: never[]) => {
    if (global.debug) {
        console.log('▓', ...args)
    }
}
