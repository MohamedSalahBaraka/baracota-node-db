"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BelongsToMany = exports.BelongsTo = exports.HasMany = exports.HasOne = void 0;
require("reflect-metadata");
const interfaces_1 = require("../types/interfaces");
/**
 * Base relationship decorator
 */
function createRelationDecorator(type) {
    return function (options) {
        return function (target, propertyKey) {
            const model = target.constructor;
            if (!model.relations) {
                model.relations = {};
            }
            // Get the type of the property to determine the related model
            const designType = Reflect.getMetadata("design:type", target, propertyKey);
            model.relations[propertyKey] = {
                type,
                model: designType,
                ...options,
            };
        };
    };
}
/**
 * Decorator for hasOne relationship
 *
 * @example
 * ```typescript
 * class User extends BaseModel {
 *   @HasOne()
 *   profile: Profile;
 * }
 * ```
 */
exports.HasOne = createRelationDecorator(interfaces_1.RelationType.HAS_ONE);
/**
 * Decorator for hasMany relationship
 *
 * @example
 * ```typescript
 * class User extends BaseModel {
 *   @HasMany()
 *   posts: Post[];
 * }
 * ```
 */
exports.HasMany = createRelationDecorator(interfaces_1.RelationType.HAS_MANY);
/**
 * Decorator for belongsTo relationship
 *
 * @example
 * ```typescript
 * class Post extends BaseModel {
 *   @BelongsTo()
 *   author: User;
 * }
 * ```
 */
exports.BelongsTo = createRelationDecorator(interfaces_1.RelationType.BELONGS_TO);
/**
 * Decorator for belongsToMany relationship
 *
 * @example
 * ```typescript
 * class User extends BaseModel {
 *   @BelongsToMany({ pivotTable: 'user_roles' })
 *   roles: Role[];
 * }
 * ```
 */
exports.BelongsToMany = createRelationDecorator(interfaces_1.RelationType.BELONGS_TO_MANY);
