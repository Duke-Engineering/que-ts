import { JSONArray } from "./types";
import { Pool } from "pg";
export declare function intPow(base: number, exponent: number): number;
export declare function calculateRetryDelay(errorCount: number): number;
export declare function formatJobArgs(args: JSONArray): string;
export declare function parseJobArgs(args: JSONArray): JSONArray;
export declare function runMigrations(client: Pool): Promise<void>;
//# sourceMappingURL=utils.d.ts.map