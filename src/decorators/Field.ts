import { BaseModel } from "../BaseModel";

/**
 * Decorator to define allowed fields for a model
 * @param fields Array of allowed field names
 *
 * @example
 * ```typescript
 * @Fields(['id', 'name', 'email'])
 * class User extends BaseModel {
 *   // model implementation
 * }
 * ```
 */
export function Fields(fields: string[]) {
  return function <T extends typeof BaseModel>(constructor: T) {
    constructor.prototype.allowedFields = fields;
  };
}

/**
 * Decorator to mark a field as primary key
 * @param fieldName Name of the primary key field
 *
 * @example
 * ```typescript
 * @PrimaryKey('user_id')
 * class User extends BaseModel {
 *   // model implementation
 * }
 * ```
 */
export function PrimaryKey(fieldName: string) {
  return function <T extends typeof BaseModel>(constructor: T) {
    constructor.prototype.primaryKey = fieldName;
  };
}
