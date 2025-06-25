import {
  DatabaseConfig,
  DatabaseConnection,
  ModelConfig,
  OrderByCondition,
  Relation,
  RelationType,
  WhereCondition,
  WhereInCondition,
} from "./types/interfaces";
import { DatabaseFactory } from "./database/factory";

export class BaseModel {
  protected static dbConfig: DatabaseConfig;
  protected static connection: DatabaseConnection;
  public table: string = "";
  public primaryKey: string = "id";
  public allowedFields: string[] = [];
  protected whereConditions: WhereCondition[] = [];
  protected whereOrConditions: WhereCondition[] = [];
  protected whereConditionsRaw: string[] = [];
  protected orderByConditions: OrderByCondition[] = [];
  protected _limit: number | null = null;
  protected offset: number | null = null;
  protected selectSumFields: Record<string, string> = {};
  protected whereInConditions: WhereInCondition[] = [];
  protected whereGroupLevel: number = 0;
  protected whereGroupConditions: WhereCondition[] = [];
  public static relations: Record<string, Relation> = {};
  [key: string]: any;
  public static config: ModelConfig = {
    timestamps: true,
    softDeletes: false,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  };
  constructor(...args: any[]) {
    if (!this.table) {
      throw new Error("Table name must be defined in the model.");
    }
    if (!this.primaryKey) {
      throw new Error("Primary key must be defined in the model.");
    }
    if (!this.allowedFields.length) {
      throw new Error("Allowed fields must be defined in the model.");
    }
    if (!BaseModel.dbConfig) {
      throw new Error("Database configuration is not initialized. Call BaseModel.initialize(config) first.");
    }
    if (!BaseModel.connection) {
      throw new Error("Database connection is not initialized. Call BaseModel.initialize(config) first.");
    }
  }
  /**
   * Initialize database connection
   */
  static async initialize(config: DatabaseConfig): Promise<void> {
    this.dbConfig = config;
    this.connection = await DatabaseFactory.createConnection(config);
  }

  /**
   * Get database connection
   */
  protected getConnection(): DatabaseConnection {
    return (this.constructor as typeof BaseModel).connection;
  }

  /**
   * Database-specific query formatting
   */
  protected formatQuery(sql: string, params: any[]): string {
    if (BaseModel.dbConfig.client === "mysql") {
      // MySQL uses ? placeholders
      return sql;
    } else {
      // SQLite uses ? placeholders too, but we might need different handling for other cases
      return sql;
    }
  }

  /**
   * Database-specific value formatting
   */
  protected formatValue(value: any): any {
    if (value instanceof Date) {
      if (BaseModel.dbConfig.client === "mysql") {
        return value.toISOString().slice(0, 19).replace("T", " ");
      } else {
        return value.toISOString();
      }
    }
    return value;
  }

  /**
   * Modified query execution to be database-agnostic
   */
  protected async executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const formattedParams = params.map((p) => this.formatValue(p));
    const [rows] = await this.getConnection().query<T>(sql, formattedParams);
    return rows;
  }

  /**
   * Modified execute method for INSERT/UPDATE/DELETE
   */
  protected async executeUpdate(sql: string, params: any[] = []): Promise<number> {
    const formattedParams = params.map((p) => this.formatValue(p));
    const result = await this.getConnection().execute(sql, formattedParams);

    if (BaseModel.dbConfig.client === "mysql") {
      return result.insertId || result.affectedRows;
    } else {
      // SQLite returns lastID for inserts and changes for updates/deletes
      return result.lastID || result.changes;
    }
  }

  // Update all methods to use executeQuery/executeUpdate instead of direct pdo calls
  async find<T = any>(id: number | string, key: string = this.primaryKey): Promise<T | null> {
    const sql = `SELECT * FROM ${this.table} WHERE ${key} = ?`;
    const rows = await this.executeQuery<T>(sql, [id]);
    return rows[0] || null;
  }

  async insert(data: Record<string, any>): Promise<number> {
    await this.validate(data, false);
    await this.beforeCreate(data);
    await this.setTimestamps(data);
    const filteredData = this.filterAllowedFields(data);
    const columns = Object.keys(filteredData).join(", ");
    const placeholders = Object.keys(filteredData)
      .map(() => "?")
      .join(", ");
    const values = Object.values(filteredData);

    const sql = `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`;
    await this.afterCreate(filteredData);
    return await this.executeUpdate(sql, values);
  }
  // Add these methods to BaseModel
  protected getPlaceholder(position: number): string {
    return BaseModel.dbConfig.client === "mysql" ? "?" : "?";
  }

  protected getLimitClause(limit?: number, offset?: number): string {
    if (BaseModel.dbConfig.client === "mysql") {
      return limit !== undefined ? `LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}` : "";
    } else {
      return limit !== undefined ? `LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}` : "";
    }
  }

  protected getAutoIncrementKeyword(): string {
    return BaseModel.dbConfig.client === "mysql" ? "AUTO_INCREMENT" : "AUTOINCREMENT";
  }
  /**
   * Add ORDER BY clause
   */
  orderBy(field: string, direction: "ASC" | "DESC" = "ASC"): this {
    this.orderByConditions.push({
      field,
      direction: direction.toUpperCase() === "DESC" ? "DESC" : "ASC",
    });
    return this;
  }

  /**
   * Count all results matching the current query conditions
   */
  async countAllResults(): Promise<number> {
    let sql = `SELECT COUNT(*) AS count FROM ${this.table}`;
    const values: any[] = [];

    const whereClauses = this.buildWhereClauses();

    if (whereClauses.clauses) {
      sql += ` WHERE ${whereClauses.clauses}`;
      values.push(...whereClauses.values);
    }

    const rows = await this.executeQuery(sql, values);
    return rows[0]?.count ? parseInt(rows[0].count) : 0;
  }

  /**
   * Start a new WHERE condition group
   */
  groupStart(): this {
    this.whereGroupLevel++;
    return this;
  }

  /**
   * End a WHERE condition group
   */
  groupEnd(): this {
    if (this.whereGroupLevel > 0) {
      this.whereGroupLevel--;
    }
    return this;
  }

  /**
   * WHERE clause (AND condition) with group support
   */
  where(field: string, value: any, operator: string = "="): this {
    if (value === null) return this.whereRaw(`${field} IS NULL`);

    const condition: WhereCondition = {
      field,
      value,
      operator,
      group_level: this.whereGroupLevel,
    };

    if (this.whereGroupLevel > 0) {
      this.whereGroupConditions.push(condition);
    } else {
      this.whereConditions.push(condition);
    }

    return this;
  }

  /**
   * OR WHERE clause with group support
   */
  orWhere(field: string, value: any, operator: string = "="): this {
    if (value === null) return this.whereRaw(`${field} IS NULL`);

    const condition: WhereCondition = {
      field,
      value,
      operator,
      group_level: this.whereGroupLevel,
    };

    if (this.whereGroupLevel > 0) {
      this.whereGroupConditions.push(condition);
    } else {
      this.whereOrConditions.push(condition);
    }

    return this;
  }

  /**
   * Execute query with WHERE conditions
   */
  protected async executeWhereQuery<T = any>(): Promise<T[]> {
    let sql = "SELECT ";

    // Handle SELECT SUM if specified
    if (Object.keys(this.selectSumFields).length > 0) {
      const sumFields = Object.entries(this.selectSumFields).map(([field, alias]) => `SUM(${field}) AS ${alias}`);
      sql += sumFields.join(", ");
      this.selectSumFields = {};
    } else {
      sql += "*";
    }

    sql += ` FROM ${this.table}`;
    const values: any[] = [];

    // Process all WHERE conditions
    const whereClauses = this.buildWhereClauses();

    // Combine WHERE clauses if any exist
    if (whereClauses.clauses) {
      sql += ` WHERE ${whereClauses.clauses}`;
      values.push(...whereClauses.values);
    }

    // ORDER BY clauses
    if (this.orderByConditions.length > 0) {
      const orderClauses = this.orderByConditions.map((order) => `${order.field} ${order.direction}`);
      sql += ` ORDER BY ${orderClauses.join(", ")}`;
    }

    // LIMIT/OFFSET clauses
    if (this._limit !== null) {
      sql += ` LIMIT ${this._limit}`;
      if (this.offset && this.offset > 0) {
        sql += ` OFFSET ${this.offset}`;
      }
    }

    // Reset conditions
    this.resetQuery();

    const rows = await this.executeQuery(sql, values);
    return rows as T[];
  }

  /**
   * Build WHERE clauses with grouped conditions
   */
  protected buildWhereClauses(): { clauses: string; values: any[] } {
    const clauses: string[] = [];
    const values: any[] = [];

    // Process normal AND conditions
    this.whereConditions.forEach((condition) => {
      clauses.push(`${condition.field} ${condition.operator} ?`);
      values.push(condition.value);
    });

    // Process WHERE IN conditions
    this.whereInConditions.forEach((condition) => {
      if (condition.values.length > 0) {
        const placeholders = condition.values.map(() => "?").join(",");
        clauses.push(`${condition.field} IN (${placeholders})`);
        values.push(...condition.values);
      }
    });

    // Process OR conditions
    const orClauses: string[] = [];
    const orValues: any[] = [];
    this.whereOrConditions.forEach((condition) => {
      orClauses.push(`${condition.field} ${condition.operator} ?`);
      orValues.push(condition.value);
    });
    if (orClauses.length > 0) {
      clauses.push(`(${orClauses.join(" OR ")})`);
      values.push(...orValues);
    }

    // Process grouped conditions
    if (this.whereGroupConditions.length > 0) {
      const groupedClauses = this.processGroupedConditions();
      if (groupedClauses.clauses) {
        clauses.push(groupedClauses.clauses);
        values.push(...groupedClauses.values);
      }
    }

    // Raw WHERE conditions
    this.whereConditionsRaw.forEach((raw) => {
      clauses.push(raw);
    });

    return {
      clauses: clauses.join(" AND "),
      values,
    };
  }

  /**
   * Process grouped conditions
   */
  protected processGroupedConditions(): { clauses: string; values: any[] } {
    const grouped: string[] = [];
    const currentGroup: Record<number, string[]> = {};
    const values: any[] = [];
    let currentLevel = 0;

    this.whereGroupConditions.forEach((condition) => {
      if (condition.group_level! > currentLevel) {
        // Start new group
        currentLevel = condition.group_level!;
        currentGroup[currentLevel] = [];
      } else if (condition.group_level! < currentLevel) {
        // End current group
        if (currentGroup[currentLevel]?.length) {
          grouped.push(`(${currentGroup[currentLevel].join(" AND ")})`);
        }
        delete currentGroup[currentLevel];
        currentLevel = condition.group_level!;
      }

      // Add condition to current group
      currentGroup[currentLevel] = currentGroup[currentLevel] || [];
      currentGroup[currentLevel].push(`${condition.field} ${condition.operator} ?`);
      values.push(condition.value);
    });

    // Add any remaining groups
    for (let i = currentLevel; i > 0; i--) {
      if (currentGroup[i]?.length) {
        grouped.push(`(${currentGroup[i].join(" AND ")})`);
      }
    }

    return {
      clauses: grouped.join(" AND "),
      values,
    };
  }

  /**
   * Reset all query conditions including groups
   */
  resetQuery(): void {
    this.whereConditions = [];
    this.whereInConditions = [];
    this.whereOrConditions = [];
    this.whereConditionsRaw = [];
    this.whereGroupConditions = [];
    this.whereGroupLevel = 0;
    this.orderByConditions = [];
    this._limit = null;
    this.offset = null;
    this.selectSumFields = {};
  }

  limit(limit: number, offset: number = 0): this {
    this._limit = limit;
    this.offset = offset;
    return this;
  }

  async count(conditions: Record<string, any> = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as total FROM ${this.table}`;
    const values: any[] = [];

    if (Object.keys(conditions).length > 0) {
      const whereClauses = Object.keys(conditions).map((field) => `${field} = ?`);
      sql += ` WHERE ${whereClauses.join(" AND ")}`;
      values.push(...Object.values(conditions));
    }

    const rows = await this.executeQuery(sql, values);
    return rows[0]?.total ? parseInt(rows[0].total) : 0;
  }

  whereRaw(whereQuery: string): this {
    this.whereConditionsRaw.push(whereQuery);
    return this;
  }

  whereIn(field: string, values: any[]): this {
    this.whereInConditions.push({
      field,
      values,
    });
    return this;
  }

  async get<T = any>(): Promise<T[]> {
    return this.executeWhereQuery<T>();
  }

  async first<T = any>(): Promise<T | null> {
    const results = await this.executeWhereQuery<T>();
    return results[0] || null;
  }

  selectSum(field: string, alias: string | null = null): this {
    this.selectSumFields[field] = alias || field;
    return this;
  }
  /**
   * TRANSACTION SUPPORT
   */
  static async transaction<T>(callback: (transaction: BaseModel) => Promise<T>): Promise<T> {
    try {
      await this.connection.beginTransaction();
      const result = await callback(new this());
      await this.connection.commit();
      return result;
    } catch (error) {
      await this.connection.rollback();
      throw error;
    } finally {
      this.connection.release();
    }
  }

  /**
   * RELATIONSHIPS
   */
  static hasOne(model: typeof BaseModel, foreignKey?: string, localKey?: string): void {
    this.relations[model.name] = {
      type: RelationType.HAS_ONE,
      model,
      foreignKey,
      localKey,
    };
  }

  static hasMany(model: typeof BaseModel, foreignKey?: string, localKey?: string): void {
    this.relations[model.name] = {
      type: RelationType.HAS_MANY,
      model,
      foreignKey,
      localKey,
    };
  }

  static belongsTo(model: typeof BaseModel, foreignKey?: string, ownerKey?: string): void {
    this.relations[model.name] = {
      type: RelationType.BELONGS_TO,
      model,
      foreignKey,
      localKey: ownerKey,
    };
  }

  static belongsToMany(model: typeof BaseModel, pivotTable: string, foreignKey?: string, relatedKey?: string): void {
    this.relations[model.name] = {
      type: RelationType.BELONGS_TO_MANY,
      model,
      pivotTable,
      foreignKey,
      relatedKey,
    };
  }

  async load<T extends BaseModel>(this: T, relations: string[]): Promise<T> {
    for (const relation of relations) {
      if ((this.constructor as typeof BaseModel).relations[relation]) {
        await this.loadRelation(relation);
      }
    }
    return this;
  }

  protected async loadRelation(relationName: string): Promise<void> {
    const relation = (this.constructor as typeof BaseModel).relations[relationName];
    if (!relation) return;

    const primaryKey = this.primaryKey;
    const relationModel = new relation.model();

    switch (relation.type) {
      case RelationType.HAS_ONE:
        const foreignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
        const localKey = relation.localKey || primaryKey;
        this[relationName] = await relationModel.where(foreignKey, this[localKey]).first();
        break;

      case RelationType.HAS_MANY:
        const manyForeignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
        const manyLocalKey = relation.localKey || primaryKey;
        this[relationName] = await relationModel.where(manyForeignKey, this[manyLocalKey]).get();
        break;

      case RelationType.BELONGS_TO:
        const belongsToForeignKey = relation.foreignKey || `${relation.model.name.toLowerCase()}_id`;
        const ownerKey = relation.localKey || relationModel.primaryKey;
        this[relationName] = await relationModel.find(this[belongsToForeignKey], ownerKey);
        break;

      case RelationType.BELONGS_TO_MANY:
        const pivotTable = relation.pivotTable || `${this.constructor.name.toLowerCase()}_${relation.model.name.toLowerCase()}`;
        const currentForeignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
        const relatedKey = relation.relatedKey || `${relation.model.name.toLowerCase()}_id`;

        const pivotQuery = `SELECT ${relatedKey} FROM ${pivotTable} WHERE ${currentForeignKey} = ?`;
        const pivotRows = await this.executeQuery(pivotQuery, [this[primaryKey]]);

        interface PivotRow {
          [key: string]: any;
        }

        const relatedIds: (number | string)[] = (pivotRows as PivotRow[]).map((row: PivotRow) => row[relatedKey]);
        if (relatedIds.length > 0) {
          this[relationName] = await relationModel.whereIn(relationModel.primaryKey, relatedIds).get();
        } else {
          this[relationName] = [];
        }
        break;
    }
  }

  /**
   * SOFT DELETES
   */
  async softDelete(): Promise<boolean> {
    if (!(this.constructor as typeof BaseModel).config.softDeletes) {
      throw new Error("Soft deletes not enabled for this model");
    }

    const deletedAt = (this.constructor as typeof BaseModel).config.deletedAt;
    if (!deletedAt) throw new Error("DeletedAt field not configured for soft deletes");
    const result = await this.update(this[this.primaryKey], { [deletedAt]: new Date() });
    return result;
  }

  async restore(): Promise<boolean> {
    if (!(this.constructor as typeof BaseModel).config.softDeletes) {
      throw new Error("Soft deletes not enabled for this model");
    }

    const deletedAt = (this.constructor as typeof BaseModel).config.deletedAt;
    if (!deletedAt) throw new Error("DeletedAt field not configured for soft deletes");
    const result = await this.update(this[this.primaryKey], { [deletedAt]: null });
    return result;
  }

  async forceDelete(): Promise<boolean> {
    return this.delete(this[this.primaryKey]);
  }

  withTrashed(): this {
    if (!(this.constructor as typeof BaseModel).config.softDeletes) {
      throw new Error("Soft deletes not enabled for this model");
    }
    return this;
  }

  onlyTrashed(): this {
    if (!(this.constructor as typeof BaseModel).config.softDeletes) {
      throw new Error("Soft deletes not enabled for this model");
    }
    const deletedAt = (this.constructor as typeof BaseModel).config.deletedAt;
    if (!deletedAt) throw new Error("DeletedAt field not configured for soft deletes");
    return this.whereNotNull(deletedAt);
  }

  /**
   * TIMESTAMPS
   */
  //   protected static boot(): void {
  //     if (this.config.timestamps) {
  //       // Add timestamp fields to allowed fields
  //       if (this.config.createdAt && !this.allowedFields.includes(this.config.createdAt)) {
  //         this.allowedFields.push(this.config.createdAt);
  //       }
  //       if (this.config.updatedAt && !this.allowedFields.includes(this.config.updatedAt)) {
  //         this.allowedFields.push(this.config.updatedAt);
  //       }
  //     }
  //     if (this.config.softDeletes && this.config.deletedAt) {
  //       this.allowedFields.push(this.config.deletedAt);
  //     }
  //   }

  protected async setTimestamps(data: Record<string, any>, isUpdate = false): Promise<void> {
    const config = (this.constructor as typeof BaseModel).config;
    if (!config.timestamps) return;

    const now = new Date();
    if (!isUpdate && config.createdAt) {
      data[config.createdAt] = now;
    }
    if (config.updatedAt) {
      data[config.updatedAt] = now;
    }
  }

  /**
   * QUERY ENHANCEMENTS
   */
  whereNotNull(field: string): this {
    return this.whereRaw(`${field} IS NOT NULL`);
  }

  whereNull(field: string): this {
    return this.whereRaw(`${field} IS NULL`);
  }

  async paginate<T = any>(
    perPage: number,
    currentPage: number = 1
  ): Promise<{
    data: T[];
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
  }> {
    const total = await this.countAllResults();
    const offset = (currentPage - 1) * perPage;
    const data = await this.limit(perPage, offset).get<T>();

    return {
      data,
      total,
      perPage,
      currentPage,
      lastPage: Math.ceil(total / perPage),
    };
  }

  /**
   * VALIDATION HOOKS
   */
  protected async validate(data: Record<string, any>, isUpdate = false): Promise<void> {
    // To be implemented by child classes
  }

  protected async beforeCreate(data: Record<string, any>): Promise<void> {
    // To be implemented by child classes
  }

  protected async afterCreate(data: Record<string, any>): Promise<void> {
    // To be implemented by child classes
  }

  protected async beforeUpdate(data: Record<string, any>): Promise<void> {
    // To be implemented by child classes
  }

  protected async afterUpdate(data: Record<string, any>): Promise<void> {
    // To be implemented by child classes
  }

  protected async beforeDelete(): Promise<void> {
    // To be implemented by child classes
  }

  protected async afterDelete(): Promise<void> {
    // To be implemented by child classes
  }

  async update(id: number | string, data: Record<string, any>, column: string | null = null): Promise<boolean> {
    await this.validate(data, true);
    await this.beforeUpdate(data);
    await this.setTimestamps(data, true);

    const keyColumn = column || this.primaryKey;
    const filteredData = this.filterAllowedFields(data);

    const setClause = Object.keys(filteredData)
      .map((field) => `${field} = ?`)
      .join(", ");
    const sql = `UPDATE ${this.table} SET ${setClause} WHERE ${keyColumn} = ?`;

    const values = [...Object.values(filteredData), id];
    const result = await this.executeUpdate(sql, values);

    await this.afterUpdate(filteredData);
    return result > 0;
  }

  async delete(id: number | string, column: string | null = null): Promise<boolean> {
    await this.beforeDelete();

    const keyColumn = column || this.primaryKey;
    if (!this.allowedFields.includes(keyColumn)) {
      throw new Error(`Column ${keyColumn} is not allowed for deletion.`);
    }

    const sql = `DELETE FROM ${this.table} WHERE ${keyColumn} = ?`;
    const [result] = await this.executeQuery(sql, [id]);

    await this.afterDelete();
    return result.affectedRows > 0;
  }

  protected filterAllowedFields(data: Record<string, any>): Record<string, any> {
    return Object.keys(data)
      .filter((key) => this.allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {} as Record<string, any>);
  }
}
