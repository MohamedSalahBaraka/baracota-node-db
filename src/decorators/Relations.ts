import "reflect-metadata";
import { BaseModel } from "../BaseModel";
import { Relation, RelationType } from "../types/interfaces";

/**
 * Base relationship decorator
 */
function createRelationDecorator(type: RelationType) {
  return function (options?: Omit<Relation, "type" | "model">) {
    return function (target: any, propertyKey: string) {
      const model = target.constructor as typeof BaseModel;

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
export const HasOne = createRelationDecorator(RelationType.HAS_ONE);

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
export const HasMany = createRelationDecorator(RelationType.HAS_MANY);

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
export const BelongsTo = createRelationDecorator(RelationType.BELONGS_TO);

/**
 * Decorator for belongsToMany relationship
 *
 * @example
 * ```typescript
 * @BelongsToMany({ pivotTable: 'user_roles' })
 * roles: Role[];
 * ```
 */
export const BelongsToMany = createRelationDecorator(RelationType.BELONGS_TO_MANY);
