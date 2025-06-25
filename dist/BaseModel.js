"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModel = void 0;
const interfaces_1 = require("./types/interfaces");
const factory_1 = require("./database/factory");
class BaseModel {
    constructor(...args) {
        this.table = "";
        this.primaryKey = "id";
        this.allowedFields = [];
        this.whereConditions = [];
        this.whereOrConditions = [];
        this.whereConditionsRaw = [];
        this.orderByConditions = [];
        this._limit = null;
        this.offset = null;
        this.selectSumFields = {};
        this.whereInConditions = [];
        this.whereGroupLevel = 0;
        this.whereGroupConditions = [];
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
    static async initialize(config) {
        this.dbConfig = config;
        this.connection = await factory_1.DatabaseFactory.createConnection(config);
    }
    /**
     * Get database connection
     */
    getConnection() {
        return this.constructor.connection;
    }
    /**
     * Database-specific query formatting
     */
    formatQuery(sql, params) {
        if (BaseModel.dbConfig.client === "mysql") {
            // MySQL uses ? placeholders
            return sql;
        }
        else {
            // SQLite uses ? placeholders too, but we might need different handling for other cases
            return sql;
        }
    }
    /**
     * Database-specific value formatting
     */
    formatValue(value) {
        if (value instanceof Date) {
            if (BaseModel.dbConfig.client === "mysql") {
                return value.toISOString().slice(0, 19).replace("T", " ");
            }
            else {
                return value.toISOString();
            }
        }
        return value;
    }
    /**
     * Modified query execution to be database-agnostic
     */
    async executeQuery(sql, params = []) {
        const formattedParams = params.map((p) => this.formatValue(p));
        const [rows] = await this.getConnection().query(sql, formattedParams);
        return rows;
    }
    /**
     * Modified execute method for INSERT/UPDATE/DELETE
     */
    async executeUpdate(sql, params = []) {
        const formattedParams = params.map((p) => this.formatValue(p));
        const result = await this.getConnection().execute(sql, formattedParams);
        if (BaseModel.dbConfig.client === "mysql") {
            return result.insertId || result.affectedRows;
        }
        else {
            // SQLite returns lastID for inserts and changes for updates/deletes
            return result.lastID || result.changes;
        }
    }
    // Update all methods to use executeQuery/executeUpdate instead of direct pdo calls
    async find(id, key = this.primaryKey) {
        const sql = `SELECT * FROM ${this.table} WHERE ${key} = ?`;
        const rows = await this.executeQuery(sql, [id]);
        return rows[0] || null;
    }
    async insert(data) {
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
    getPlaceholder(position) {
        return BaseModel.dbConfig.client === "mysql" ? "?" : "?";
    }
    getLimitClause(limit, offset) {
        if (BaseModel.dbConfig.client === "mysql") {
            return limit !== undefined ? `LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}` : "";
        }
        else {
            return limit !== undefined ? `LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}` : "";
        }
    }
    getAutoIncrementKeyword() {
        return BaseModel.dbConfig.client === "mysql" ? "AUTO_INCREMENT" : "AUTOINCREMENT";
    }
    /**
     * Add ORDER BY clause
     */
    orderBy(field, direction = "ASC") {
        this.orderByConditions.push({
            field,
            direction: direction.toUpperCase() === "DESC" ? "DESC" : "ASC",
        });
        return this;
    }
    /**
     * Count all results matching the current query conditions
     */
    async countAllResults() {
        let sql = `SELECT COUNT(*) AS count FROM ${this.table}`;
        const values = [];
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
    groupStart() {
        this.whereGroupLevel++;
        return this;
    }
    /**
     * End a WHERE condition group
     */
    groupEnd() {
        if (this.whereGroupLevel > 0) {
            this.whereGroupLevel--;
        }
        return this;
    }
    /**
     * WHERE clause (AND condition) with group support
     */
    where(field, value, operator = "=") {
        if (value === null)
            return this.whereRaw(`${field} IS NULL`);
        const condition = {
            field,
            value,
            operator,
            group_level: this.whereGroupLevel,
        };
        if (this.whereGroupLevel > 0) {
            this.whereGroupConditions.push(condition);
        }
        else {
            this.whereConditions.push(condition);
        }
        return this;
    }
    /**
     * OR WHERE clause with group support
     */
    orWhere(field, value, operator = "=") {
        if (value === null)
            return this.whereRaw(`${field} IS NULL`);
        const condition = {
            field,
            value,
            operator,
            group_level: this.whereGroupLevel,
        };
        if (this.whereGroupLevel > 0) {
            this.whereGroupConditions.push(condition);
        }
        else {
            this.whereOrConditions.push(condition);
        }
        return this;
    }
    /**
     * Execute query with WHERE conditions
     */
    async executeWhereQuery() {
        let sql = "SELECT ";
        // Handle SELECT SUM if specified
        if (Object.keys(this.selectSumFields).length > 0) {
            const sumFields = Object.entries(this.selectSumFields).map(([field, alias]) => `SUM(${field}) AS ${alias}`);
            sql += sumFields.join(", ");
            this.selectSumFields = {};
        }
        else {
            sql += "*";
        }
        sql += ` FROM ${this.table}`;
        const values = [];
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
        return rows;
    }
    /**
     * Build WHERE clauses with grouped conditions
     */
    buildWhereClauses() {
        const clauses = [];
        const values = [];
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
        const orClauses = [];
        const orValues = [];
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
    processGroupedConditions() {
        const grouped = [];
        const currentGroup = {};
        const values = [];
        let currentLevel = 0;
        this.whereGroupConditions.forEach((condition) => {
            if (condition.group_level > currentLevel) {
                // Start new group
                currentLevel = condition.group_level;
                currentGroup[currentLevel] = [];
            }
            else if (condition.group_level < currentLevel) {
                // End current group
                if (currentGroup[currentLevel]?.length) {
                    grouped.push(`(${currentGroup[currentLevel].join(" AND ")})`);
                }
                delete currentGroup[currentLevel];
                currentLevel = condition.group_level;
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
    resetQuery() {
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
    limit(limit, offset = 0) {
        this._limit = limit;
        this.offset = offset;
        return this;
    }
    async count(conditions = {}) {
        let sql = `SELECT COUNT(*) as total FROM ${this.table}`;
        const values = [];
        if (Object.keys(conditions).length > 0) {
            const whereClauses = Object.keys(conditions).map((field) => `${field} = ?`);
            sql += ` WHERE ${whereClauses.join(" AND ")}`;
            values.push(...Object.values(conditions));
        }
        const rows = await this.executeQuery(sql, values);
        return rows[0]?.total ? parseInt(rows[0].total) : 0;
    }
    whereRaw(whereQuery) {
        this.whereConditionsRaw.push(whereQuery);
        return this;
    }
    whereIn(field, values) {
        this.whereInConditions.push({
            field,
            values,
        });
        return this;
    }
    async get() {
        return this.executeWhereQuery();
    }
    async first() {
        const results = await this.executeWhereQuery();
        return results[0] || null;
    }
    selectSum(field, alias = null) {
        this.selectSumFields[field] = alias || field;
        return this;
    }
    /**
     * TRANSACTION SUPPORT
     */
    static async transaction(callback) {
        try {
            await this.connection.beginTransaction();
            const result = await callback(new this());
            await this.connection.commit();
            return result;
        }
        catch (error) {
            await this.connection.rollback();
            throw error;
        }
        finally {
            this.connection.release();
        }
    }
    /**
     * RELATIONSHIPS
     */
    static hasOne(model, foreignKey, localKey) {
        this.relations[model.name] = {
            type: interfaces_1.RelationType.HAS_ONE,
            model,
            foreignKey,
            localKey,
        };
    }
    static hasMany(model, foreignKey, localKey) {
        this.relations[model.name] = {
            type: interfaces_1.RelationType.HAS_MANY,
            model,
            foreignKey,
            localKey,
        };
    }
    static belongsTo(model, foreignKey, ownerKey) {
        this.relations[model.name] = {
            type: interfaces_1.RelationType.BELONGS_TO,
            model,
            foreignKey,
            localKey: ownerKey,
        };
    }
    static belongsToMany(model, pivotTable, foreignKey, relatedKey) {
        this.relations[model.name] = {
            type: interfaces_1.RelationType.BELONGS_TO_MANY,
            model,
            pivotTable,
            foreignKey,
            relatedKey,
        };
    }
    async load(relations) {
        for (const relation of relations) {
            if (this.constructor.relations[relation]) {
                await this.loadRelation(relation);
            }
        }
        return this;
    }
    async loadRelation(relationName) {
        const relation = this.constructor.relations[relationName];
        if (!relation)
            return;
        const primaryKey = this.primaryKey;
        const relationModel = new relation.model();
        switch (relation.type) {
            case interfaces_1.RelationType.HAS_ONE:
                const foreignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
                const localKey = relation.localKey || primaryKey;
                this[relationName] = await relationModel.where(foreignKey, this[localKey]).first();
                break;
            case interfaces_1.RelationType.HAS_MANY:
                const manyForeignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
                const manyLocalKey = relation.localKey || primaryKey;
                this[relationName] = await relationModel.where(manyForeignKey, this[manyLocalKey]).get();
                break;
            case interfaces_1.RelationType.BELONGS_TO:
                const belongsToForeignKey = relation.foreignKey || `${relation.model.name.toLowerCase()}_id`;
                const ownerKey = relation.localKey || relationModel.primaryKey;
                this[relationName] = await relationModel.find(this[belongsToForeignKey], ownerKey);
                break;
            case interfaces_1.RelationType.BELONGS_TO_MANY:
                const pivotTable = relation.pivotTable || `${this.constructor.name.toLowerCase()}_${relation.model.name.toLowerCase()}`;
                const currentForeignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
                const relatedKey = relation.relatedKey || `${relation.model.name.toLowerCase()}_id`;
                const pivotQuery = `SELECT ${relatedKey} FROM ${pivotTable} WHERE ${currentForeignKey} = ?`;
                const pivotRows = await this.executeQuery(pivotQuery, [this[primaryKey]]);
                const relatedIds = pivotRows.map((row) => row[relatedKey]);
                if (relatedIds.length > 0) {
                    this[relationName] = await relationModel.whereIn(relationModel.primaryKey, relatedIds).get();
                }
                else {
                    this[relationName] = [];
                }
                break;
        }
    }
    /**
     * SOFT DELETES
     */
    async softDelete() {
        if (!this.constructor.config.softDeletes) {
            throw new Error("Soft deletes not enabled for this model");
        }
        const deletedAt = this.constructor.config.deletedAt;
        if (!deletedAt)
            throw new Error("DeletedAt field not configured for soft deletes");
        const result = await this.update(this[this.primaryKey], { [deletedAt]: new Date() });
        return result;
    }
    async restore() {
        if (!this.constructor.config.softDeletes) {
            throw new Error("Soft deletes not enabled for this model");
        }
        const deletedAt = this.constructor.config.deletedAt;
        if (!deletedAt)
            throw new Error("DeletedAt field not configured for soft deletes");
        const result = await this.update(this[this.primaryKey], { [deletedAt]: null });
        return result;
    }
    async forceDelete() {
        return this.delete(this[this.primaryKey]);
    }
    withTrashed() {
        if (!this.constructor.config.softDeletes) {
            throw new Error("Soft deletes not enabled for this model");
        }
        return this;
    }
    onlyTrashed() {
        if (!this.constructor.config.softDeletes) {
            throw new Error("Soft deletes not enabled for this model");
        }
        const deletedAt = this.constructor.config.deletedAt;
        if (!deletedAt)
            throw new Error("DeletedAt field not configured for soft deletes");
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
    async setTimestamps(data, isUpdate = false) {
        const config = this.constructor.config;
        if (!config.timestamps)
            return;
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
    whereNotNull(field) {
        return this.whereRaw(`${field} IS NOT NULL`);
    }
    whereNull(field) {
        return this.whereRaw(`${field} IS NULL`);
    }
    async paginate(perPage, currentPage = 1) {
        const total = await this.countAllResults();
        const offset = (currentPage - 1) * perPage;
        const data = await this.limit(perPage, offset).get();
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
    async validate(data, isUpdate = false) {
        // To be implemented by child classes
    }
    async beforeCreate(data) {
        // To be implemented by child classes
    }
    async afterCreate(data) {
        // To be implemented by child classes
    }
    async beforeUpdate(data) {
        // To be implemented by child classes
    }
    async afterUpdate(data) {
        // To be implemented by child classes
    }
    async beforeDelete() {
        // To be implemented by child classes
    }
    async afterDelete() {
        // To be implemented by child classes
    }
    async update(id, data, column = null) {
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
    async delete(id, column = null) {
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
    filterAllowedFields(data) {
        return Object.keys(data)
            .filter((key) => this.allowedFields.includes(key))
            .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
        }, {});
    }
}
exports.BaseModel = BaseModel;
BaseModel.relations = {};
BaseModel.config = {
    timestamps: true,
    softDeletes: false,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
};
