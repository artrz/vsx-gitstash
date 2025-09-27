declare global {
    var debug: boolean

    /**
     * Sets the debug mode. Note that process.env.EXT_DEBUG === '1' have precedence over
     * the specified state.
     */
    var setDebug: (state: boolean) => void

    /**
     * Logs to the console ONLY when debug mode is enabled.
     */
    var dbg: (...args: any[]) => void
}

// we must force tsc to interpret this file as a module, resolves
// "Augmentations for the global scope can only be directly nested in external modules or ambient module declarations."
// error
export { }
