/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { toDateTimeIso } from './DateFormat'

// typeof doesn't evaluate "window", only tries to get its type.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
const _global = (typeof window !== 'undefined' ? window /* browser */ : global /* node */) as any

_global.debug = process.env.EXT_DEBUG === '1'

_global.setDebug = (state: boolean) => {
    // When setting debug mode, we always give precedence to the env flag.
    _global.debug = process.env.EXT_DEBUG === '1' || state
}

_global.dbg = (...args: never[]) => {
    if (global.debug) {
        console.log('▓', toDateTimeIso(new Date(), false, true), ...args)
    }
}
