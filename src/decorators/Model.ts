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
export function Model(tableName: string) {
  return function <T extends typeof BaseModel>(constructor: T) {
    constructor.prototype.table = tableName;
  };
}
