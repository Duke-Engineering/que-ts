"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intPow = intPow;
exports.calculateRetryDelay = calculateRetryDelay;
exports.formatJobArgs = formatJobArgs;
exports.parseJobArgs = parseJobArgs;
function intPow(base, exponent) {
    if (exponent < 0) {
        return 0;
    }
    let result = 1;
    for (let i = 0; i < exponent; i++) {
        result *= base;
    }
    return result;
}
function calculateRetryDelay(errorCount) {
    return intPow(errorCount, 4);
}
function formatJobArgs(args) {
    return JSON.stringify(args);
}
function parseJobArgs(args) {
    // PostgreSQL JSON column is already parsed by the pg driver
    // Just validate it's an array and return it
    if (!Array.isArray(args)) {
        throw new Error(`Expected job arguments to be an array, received: ${typeof args}`);
    }
    return args;
}
//# sourceMappingURL=utils.js.map