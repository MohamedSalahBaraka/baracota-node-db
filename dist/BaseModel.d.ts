import { DatabaseConfig, DatabaseConnection, ModelConfig, OrderByCondition, Relation, WhereCondition, WhereInCondition } from "./types/interfaces";
export declare class BaseModel {
    protected static dbConfig: DatabaseConfig;
    protected static connection: DatabaseConnection;
    table: string;
    primaryKey: string;
    allowedFields: string[];
    protected whereConditions: WhereCondition[];
    protected whereOrConditions: WhereCondition[];
    protected whereConditionsRaw: string[];
    protected orderByConditions: OrderByCondition[];
    protected _limit: number | null;
    protected offset: number | null;
    protected selectSumFields: Record<string, string>;
    protected whereInConditions: WhereInCondition[];
    protected whereGroupLevel: number;
    protected whereGroupConditions: WhereCondition[];
    static relations: Record<string, Relation>;
    [key: string]: any;
    static config: ModelConfig;
    constructor(...args: any[]);
    /**
     * Initialize database connection
     */
    static initialize(config: DatabaseConfig): Promise<void>;
    /**
     * Get database connection
     */
    protected getConnection(): DatabaseConnection;
    /**
     * Database-specific query formatting
     */
    protected formatQuery(sql: string, params: any[]): string;
    /**
     * Database-specific value formatting
     */
    protected formatValue(value: any): any;
    /**
     * Modified query execution to be database-agnostic
     */
    protected executeQuery<T = any>(sql: string, params?: any[]): Promise<T[]>;
    /**
     * Modified execute method for INSERT/UPDATE/DELETE
     */
    protected executeUpdate(sql: string, params?: any[]): Promise<number>;
    find<T = any>(id: number | string, key?: string): Promise<T | null>;
    insert(data: Record<string, any>): Promise<number>;
    protected getPlaceholder(position: number): string;
    protected getLimitClause(limit?: number, offset?: number): string;
    protected getAutoIncrementKeyword(): string;
    /**
     * Add ORDER BY clause
     */
    orderBy(field: string, direction?: "ASC" | "DESC"): this;
    /**
     * Count all results matching the current query conditions
     */
    countAllResults(): Promise<number>;
    /**
     * Start a new WHERE condition group
     */
    groupStart(): this;
    /**
     * End a WHERE condition group
     */
    groupEnd(): this;
    /**
     * WHERE clause (AND condition) with group support
     */
    where(field: string, value: any, operator?: string): this;
    /**
     * OR WHERE clause with group support
     */
    orWhere(field: string, value: any, operator?: string): this;
    /**
     * Execute query with WHERE conditions
     */
    protected executeWhereQuery<T = any>(): Promise<T[]>;
    /**
     * Build WHERE clauses with grouped conditions
     */
    protected buildWhereClauses(): {
        clauses: string;
        values: any[];
    };
    /**
     * Process grouped conditions
     */
    protected processGroupedConditions(): {
        clauses: string;
        values: any[];
    };
    /**
     * Reset all query conditions including groups
     */
    resetQuery(): void;
    limit(limit: number, offset?: number): this;
    count(conditions?: Record<string, any>): Promise<number>;
    whereRaw(whereQuery: string): this;
    whereIn(field: string, values: any[]): this;
    get<T = any>(): Promise<T[]>;
    first<T = any>(): Promise<T | null>;
    selectSum(field: string, alias?: string | null): this;
    /**
     * TRANSACTION SUPPORT
     */
    static transaction<T>(callback: (transaction: BaseModel) => Promise<T>): Promise<T>;
    /**
     * RELATIONSHIPS
     */
    static hasOne(model: typeof BaseModel, foreignKey?: string, localKey?: string): void;
    static hasMany(model: typeof BaseModel, foreignKey?: string, localKey?: string): void;
    static belongsTo(model: typeof BaseModel, foreignKey?: string, ownerKey?: string): void;
    static belongsToMany(model: typeof BaseModel, pivotTable: string, foreignKey?: string, relatedKey?: string): void;
    load<T extends BaseModel>(this: T, relations: string[]): Promise<T>;
    protected loadRelation(relationName: string): Promise<void>;
    /**
     * SOFT DELETES
     */
    softDelete(): Promise<boolean>;
    restore(): Promise<boolean>;
    forceDelete(): Promise<boolean>;
    withTrashed(): this;
    onlyTrashed(): this;
    /**
     * TIMESTAMPS
     */
    protected setTimestamps(data: Record<string, any>, isUpdate?: boolean): Promise<void>;
    /**
     * QUERY ENHANCEMENTS
     */
    whereNotNull(field: string): this;
    whereNull(field: string): this;
    paginate<T = any>(perPage: number, currentPage?: number): Promise<{
        data: T[];
        total: number;
        perPage: number;
        currentPage: number;
        lastPage: number;
    }>;
    /**
     * VALIDATION HOOKS
     */
    protected validate(data: Record<string, any>, isUpdate?: boolean): Promise<void>;
    protected beforeCreate(data: Record<string, any>): Promise<void>;
    protected afterCreate(data: Record<string, any>): Promise<void>;
    protected beforeUpdate(data: Record<string, any>): Promise<void>;
    protected afterUpdate(data: Record<string, any>): Promise<void>;
    protected beforeDelete(): Promise<void>;
    protected afterDelete(): Promise<void>;
    update(id: number | string, data: Record<string, any>, column?: string | null): Promise<boolean>;
    delete(id: number | string, column?: string | null): Promise<boolean>;
    protected filterAllowedFields(data: Record<string, any>): Record<string, any>;
}
