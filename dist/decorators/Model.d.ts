import { BaseModel } from "../BaseModel";
/**
 * Decorator to define the table name for a model
 * @param tableName Name of the database table
 *
 * @example
 * ```typescript
 * @Model('users')
 * class User extends BaseModel {
 *   // model implementation
 * }
 * ```
 */
export declare function Model(tableName: string): <T extends typeof BaseModel>(constructor: T) => void;
