import "reflect-metadata";
import { Relation } from "../types/interfaces";
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
export declare const HasOne: (options?: Omit<Relation, "type" | "model">) => (target: any, propertyKey: string) => void;
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
export declare const HasMany: (options?: Omit<Relation, "type" | "model">) => (target: any, propertyKey: string) => void;
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
export declare const BelongsTo: (options?: Omit<Relation, "type" | "model">) => (target: any, propertyKey: string) => void;
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
export declare const BelongsToMany: (options?: Omit<Relation, "type" | "model">) => (target: any, propertyKey: string) => void;
