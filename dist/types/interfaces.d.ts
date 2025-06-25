import { BaseModel } from "../BaseModel";
export interface DatabaseConnection {
    query<T = any>(sql: string, params?: any[]): Promise<[T[], any]>;
    execute(sql: string, params?: any[]): Promise<any>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): Promise<void>;
}
export interface DatabaseConfig {
    client: "mysql" | "sqlite";
    connection: MysqlConnectionConfig | SqliteConnectionConfig;
}
export interface MysqlConnectionConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port?: number;
}
export interface SqliteConnectionConfig {
    filename: string;
}
export declare enum RelationType {
    HAS_ONE = "hasOne",
    HAS_MANY = "hasMany",
    BELONGS_TO = "belongsTo",
    BELONGS_TO_MANY = "belongsToMany"
}
export interface Relation {
    type: RelationType;
    model: typeof BaseModel;
    foreignKey?: string;
    localKey?: string;
    pivotTable?: string;
    relatedKey?: string;
}
export interface ModelConfig {
    timestamps?: boolean;
    softDeletes?: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
}
export interface QueryOptions {
    withTrashed?: boolean;
    with?: string[];
}
export interface WhereCondition {
    field: string;
    value: any;
    operator: string;
    group_level?: number;
}
export interface WhereInCondition {
    field: string;
    values: any[];
}
export interface OrderByCondition {
    field: string;
    direction: "ASC" | "DESC";
}
export interface SelectSumField {
    field: string;
    alias: string;
}
