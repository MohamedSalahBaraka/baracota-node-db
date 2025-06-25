// src/index.ts

import { BaseModel } from "./BaseModel";
import { DatabaseConfig, DatabaseConnection, RelationType } from "./types/interfaces";

// Core exports
export { BaseModel } from "./BaseModel";
export type { ModelConfig } from "./types/interfaces";

// Database configuration exports
export { DatabaseFactory } from "./database/factory";
export type { DatabaseConfig, MysqlConnectionConfig, SqliteConnectionConfig } from "./types/interfaces";

// Relationship exports
export { RelationType } from "./types/interfaces";
export type { Relation } from "./types/interfaces";

// Query building exports
export type { WhereCondition, WhereInCondition, OrderByCondition, SelectSumField, QueryOptions } from "./types/interfaces";

// Default initialization function
/**
 * Initializes the ORM with database configuration
 *
 * @param config Database configuration
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```typescript
 * import { initORM } from 'your-orm-package';
 *
 * await initORM({
 *   client: 'mysql',
 *   connection: {
 *     host: 'localhost',
 *     user: 'root',
 *     password: '',
 *     database: 'test'
 *   }
 * });
 * ```
 */
export async function initORM(config: DatabaseConfig): Promise<void> {
  await BaseModel.initialize(config);
}

// Helper functions for common operations
/**
 * Creates a new model instance with the given table name
 *
 * @param tableName Name of the database table
 * @returns A class that extends BaseModel for the specified table
 *
 * @example
 * ```typescript
 * const User = createModel('users');
 * const users = await User.find(1);
 * ```
 */
export function createModel(tableName: string): typeof BaseModel {
  return class extends BaseModel {
    public table = tableName;
  };
}

// Export transaction function directly
/**
 * Executes operations within a database transaction
 *
 * @param callback Async function containing operations to execute
 * @returns Promise that resolves with the callback's return value
 *
 * @example
 * ```typescript
 * await transaction(async (trx) => {
 *   await UserModel.insert({ name: 'John' }, trx);
 *   await AccountModel.insert({ userId: 1, balance: 100 }, trx);
 * });
 * ```
 */
export async function transaction<T>(callback: (transaction: BaseModel) => Promise<T>): Promise<T> {
  return BaseModel.transaction(callback);
}

// Export all type utilities
export * from "./types/index";
// Export all decorators
export * from "./decorators/index";

// Default export for simpler imports
export default {
  BaseModel,
  initORM,
  createModel,
  transaction,
  RelationType,
};
