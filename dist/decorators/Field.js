"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fields = Fields;
exports.PrimaryKey = PrimaryKey;
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
function Fields(fields) {
    return function (constructor) {
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
function PrimaryKey(fieldName) {
    return function (constructor) {
        constructor.prototype.primaryKey = fieldName;
    };
}
