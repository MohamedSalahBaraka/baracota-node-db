import { BaseModel } from "../BaseModel";
import { DatabaseConnection } from "./interfaces";
/**
 * Type for representing paginated results
 */
export type PaginatedResult<T> = {
    data: T[];
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
};
/**
 * Type for model class constructor
 */
export type ModelConstructor<T extends BaseModel> = new (connection?: DatabaseConnection) => T;
/**
 * Type for representing query results with relationships
 */
export type WithRelations<T, R extends string> = T & {
    [K in R]: any;
};
/**
 * Type for model attributes
 */
export type ModelAttributes<T> = Omit<T, keyof BaseModel>;
