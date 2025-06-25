import { BaseModel } from "./BaseModel";
import { DatabaseConfig, RelationType } from "./types/interfaces";
export { BaseModel } from "./BaseModel";
export type { ModelConfig } from "./types/interfaces";
export { DatabaseFactory } from "./database/factory";
export type { DatabaseConfig, MysqlConnectionConfig, SqliteConnectionConfig } from "./types/interfaces";
export { RelationType } from "./types/interfaces";
export type { Relation } from "./types/interfaces";
export type { WhereCondition, WhereInCondition, OrderByCondition, SelectSumField, QueryOptions } from "./types/interfaces";
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
export declare function initORM(config: DatabaseConfig): Promise<void>;
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
export declare function createModel(tableName: string): typeof BaseModel;
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
export declare function transaction<T>(callback: (transaction: BaseModel) => Promise<T>): Promise<T>;
export * from "./types/index";
export * from "./decorators/index";
declare const _default: {
    BaseModel: typeof BaseModel;
    initORM: typeof initORM;
    createModel: typeof createModel;
    transaction: typeof transaction;
    RelationType: typeof RelationType;
};
export default _default;
