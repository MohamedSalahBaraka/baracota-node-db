"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = void 0;
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
function Model(tableName) {
    return function (constructor) {
        constructor.prototype.table = tableName;
    };
}
exports.Model = Model;
