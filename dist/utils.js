"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.intPow = intPow;
exports.calculateRetryDelay = calculateRetryDelay;
exports.formatJobArgs = formatJobArgs;
exports.parseJobArgs = parseJobArgs;
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
async function runMigrations(client) {
    // test if the client is connected
    try {
        await client.query("SELECT 1");
    }
    catch (error) {
        throw new Error("Client is not connected");
    }
    // Check if the que_jobs table exists
    const tableExistsQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'que_jobs'
    );
  `;
    const tableExistsResult = await client.query(tableExistsQuery);
    const tableExists = tableExistsResult.rows[0].exists;
    if (!tableExists) {
        const migrations = fs_1.default.readFileSync(path_1.default.join(__dirname, "../migrations/schema.sql"), "utf8");
        await client.query(migrations);
    }
}
//# sourceMappingURL=utils.js.map