import fs from "fs";
import path from "path";
import { JSONArray } from "./types";
import { Pool } from "pg";

export function intPow(base: number, exponent: number): number {
  if (exponent < 0) {
    return 0;
  }

  let result = 1;
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }

  return result;
}

export function calculateRetryDelay(errorCount: number): number {
  return intPow(errorCount, 4);
}

export function formatJobArgs(args: JSONArray): string {
  return JSON.stringify(args);
}

export function parseJobArgs(args: JSONArray): JSONArray {
  // PostgreSQL JSON column is already parsed by the pg driver
  // Just validate it's an array and return it
  if (!Array.isArray(args)) {
    throw new Error(
      `Expected job arguments to be an array, received: ${typeof args}`
    );
  }

  return args;
}

export async function runMigrations(client: Pool): Promise<void> {
  // test if the client is connected
  try {
    await client.query("SELECT 1");
  } catch (error) {
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
    const migrations = fs.readFileSync(
      path.join(__dirname, "../migrations/schema.sql"),
      "utf8"
    );
    await client.query(migrations);
  }
}
