import { DatabaseConfig, DatabaseConnection, EagerLoadConstraint, ModelConfig, OrderByCondition, Relation, WhereCondition, WhereInCondition, WithOptions } from "./types/interfaces";
export declare class BaseModel {
    protected static dbConfig: DatabaseConfig;
    protected static connection: DatabaseConnection;
    table: string;
    primaryKey: string;
    allowedFields: string[];
    protected whereConditions: WhereCondition[];
    protected whereOrConditions: WhereCondition[];
    protected whereConditionsRaw: {
        sql: string;
        params: string[];
    }[];
    protected orderByConditions: OrderByCondition[];
    protected _limit: number | null;
    protected offset: number | null;
    protected selectSumFields: Record<string, string>;
    protected whereInConditions: WhereInCondition[];
    protected whereGroupLevel: number;
    protected whereGroupConditions: WhereCondition[];
    static relations: Record<string, Relation>;
    protected _eagerLoad: {
        relations: string[];
        constraints: EagerLoadConstraint;
        currentDepth: number;
        maxDepth: number;
    };
    [key: string]: any;
    static config: ModelConfig;
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
     * Eager load relationships
     */
    with(relations: string | string[], options?: WithOptions): this;
    protected processEagerLoad<T = any>(results: T[]): Promise<T[]>;
    private loadRelations;
    protected loadHasOneRelation<T>(results: T[], relationName: string, relation: Relation, relationModel: BaseModel, primaryKey: string): Promise<void>;
    protected loadHasManyRelation<T>(results: T[], relationName: string, relation: Relation, relationModel: BaseModel, primaryKey: string): Promise<void>;
    protected loadBelongsToRelation<T>(results: T[], relationName: string, relation: Relation, relationModel: BaseModel): Promise<void>;
    protected loadBelongsToManyRelation<T>(results: T[], relationName: string, relation: Relation, relationModel: BaseModel, primaryKey: string): Promise<void>;
    get<T = any>(options?: {
        chunkSize?: number;
    }): Promise<T[]>;
    first<T = any>(): Promise<T | null>;
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
    where(field: string, ...args: any[]): this;
    whereNull(field: string): this;
    whereNotNull(field: string): this;
    whereIn(field: string, values: any[]): this;
    whereBetween(field: string, range: [any, any]): this;
    whereGroup(callback: (query: this) => void): this;
    orWhereGroup(callback: (query: this) => void): this;
    whereExists(subquery: (query: this) => void): this;
    whereNotExists(subquery: (query: this) => void): this;
    protected addWhereCondition(field: string, operator: string, value?: any, conjunction?: "AND" | "OR"): this;
    whereRaw(sql: string, params?: any[]): this;
    protected buildWhereClauses(): {
        sql: string | undefined;
        params: any[];
    };
    private buildSingleCondition;
    whereJsonContains(field: string, value: any): this;
    whereJsonLength(field: string, operator: string, length: number): this;
    whereDate(field: string, operator: string, value: Date | string): this;
    whereTime(field: string, operator: string, value: Date | string): this;
    whereFullText(fields: string[], query: string, mode?: "natural" | "boolean"): this;
    /**
     * OR WHERE clause with group support
     */
    orWhere(field: string, value: any, operator?: string): this;
    /**
     * Execute query with WHERE conditions
     */
    protected executeWhereQuery<T = any>(): Promise<T[]>;
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
    selectSum(field: string, alias?: string | null): this;
    /**
     * TRANSACTION SUPPORT
     */
    static transaction<T>(callback: (transaction: BaseModel) => Promise<T>): Promise<T>;
    /**
     * RELATIONSHIPS
     */
    static hasOne({ model, foreignKey, localKey, as }: {
        model: typeof BaseModel;
        foreignKey?: string;
        localKey?: string;
        as?: string;
    }): void;
    static hasMany({ model, foreignKey, localKey, as }: {
        model: typeof BaseModel;
        foreignKey?: string;
        localKey?: string;
        as?: string;
    }): void;
    static belongsTo({ model, foreignKey, ownerKey, as }: {
        model: typeof BaseModel;
        foreignKey?: string;
        ownerKey?: string;
        as?: string;
    }): void;
    static belongsToMany({ model, foreignKey, pivotTable, relatedKey, as, }: {
        model: typeof BaseModel;
        pivotTable: string;
        foreignKey?: string;
        relatedKey?: string;
        as?: string;
    }): void;
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
    update(data: Record<string, any>): Promise<boolean>;
    update(id: string | number | Array<string | number>, data: Record<string, any>, column?: string | null): Promise<boolean>;
    delete(): Promise<boolean>;
    delete(id: string | number | Array<string | number>, column?: string | null): Promise<boolean>;
    protected filterAllowedFields(data: Record<string, any>): Record<string, any>;
}
