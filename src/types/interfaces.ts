import { BaseModel } from "../BaseModel";

// src/database/interfaces.ts
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

export enum RelationType {
  HAS_ONE = "hasOne",
  HAS_MANY = "hasMany",
  BELONGS_TO = "belongsTo",
  BELONGS_TO_MANY = "belongsToMany",
}
export interface EagerLoadConstraint {
  [key: string]: (query: BaseModel) => void;
}

export interface WithOptions {
  constraints?: EagerLoadConstraint;
  maxDepth?: number;
}
export interface WhereOperator {
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "NOT LIKE" | "IN" | "NOT IN" | "BETWEEN" | "NOT BETWEEN" | "IS NULL" | "IS NOT NULL";
  value?: any | [any, any]; // For BETWEEN/NOT BETWEEN
}

export type WhereValue = WhereOperator | any;
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
  field?: string;
  value?: any;
  type?: string;
  conditions?: WhereCondition[];
  conjunction?: "AND" | "OR";
  operator?: string;
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
