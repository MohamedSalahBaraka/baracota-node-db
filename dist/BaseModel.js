"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModel = void 0;
const interfaces_1 = require("./types/interfaces");
const factory_1 = require("./database/factory");
class BaseModel {
    constructor() {
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
        this._eagerLoad = { constraints: {}, relations: [], currentDepth: 0, maxDepth: 3 };
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
        const whereParts = [` ${key} = ?`];
        const whereValues = [id];
        const queryBuilderWhere = this.buildWhereClauses();
        if (queryBuilderWhere.sql) {
            whereParts.push(queryBuilderWhere.sql);
            whereValues.push(...queryBuilderWhere.params);
        }
        const whereClause = `WHERE ${whereParts.join(" AND ")}`;
        const sql = `SELECT * FROM ${this.table} ${whereClause} LIMIT 1`;
        const rows = await this.executeQuery(sql, [id]);
        const result = await this.processEagerLoad(rows);
        return result[0] || null;
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
     * Eager load relationships
     */
    with(relations, options) {
        this._eagerLoad = {
            relations: Array.isArray(relations) ? relations : [relations],
            constraints: options?.constraints || {},
            currentDepth: 0,
            maxDepth: options?.maxDepth || 3,
        };
        return this;
    }
    async processEagerLoad(results) {
        if (!this._eagerLoad || results.length === 0)
            return results;
        await this.loadRelations(results, this._eagerLoad);
        return results;
    }
    // New recursive loadRelations method
    async loadRelations(parents, eagerLoad, currentRelationPath = [], seen = new Set()) {
        const relationKey = parents.map((p) => p[this.primaryKey]).join(",") + "|" + eagerLoad.relations.join(",");
        if (seen.has(relationKey))
            return;
        seen.add(relationKey);
        if (eagerLoad.currentDepth >= eagerLoad.maxDepth)
            return;
        for (const relationName of eagerLoad.relations) {
            const fullPath = [...currentRelationPath, relationName].join(".");
            const relationParts = relationName.split(".");
            const immediateRelation = relationParts[0];
            // Validate relation exists
            const relation = this.constructor.relations[immediateRelation];
            if (!relation) {
                throw new Error(`Relation ${immediateRelation} not defined on ${this.constructor.name}`);
            }
            // Process immediate relation
            const relationModel = new relation.model();
            const primaryKey = this.primaryKey;
            // Apply constraints if any
            if (eagerLoad.constraints[fullPath]) {
                eagerLoad.constraints[fullPath](relationModel);
            }
            // Load relation based on type
            switch (relation.type) {
                case interfaces_1.RelationType.HAS_ONE:
                    await this.loadHasOneRelation(parents, immediateRelation, relation, relationModel, primaryKey);
                    break;
                case interfaces_1.RelationType.HAS_MANY:
                    await this.loadHasManyRelation(parents, immediateRelation, relation, relationModel, primaryKey);
                    break;
                case interfaces_1.RelationType.BELONGS_TO:
                    await this.loadBelongsToRelation(parents, immediateRelation, relation, relationModel);
                    break;
                case interfaces_1.RelationType.BELONGS_TO_MANY:
                    await this.loadBelongsToManyRelation(parents, immediateRelation, relation, relationModel, primaryKey);
                    break;
                // ... other relation types
            }
            // Process nested relations
            if (relationParts.length > 1) {
                const nestedRelations = [relationParts.slice(1).join(".")];
                const nestedParents = parents
                    .map((p) => p[immediateRelation])
                    .reduce((acc, val) => {
                    if (Array.isArray(val)) {
                        acc.push(...val);
                    }
                    else if (val) {
                        acc.push(val);
                    }
                    return acc;
                }, []);
                if (nestedParents.length > 0) {
                    await this.loadRelations(nestedParents, {
                        relations: nestedRelations,
                        constraints: eagerLoad.constraints,
                        currentDepth: eagerLoad.currentDepth + 1,
                        maxDepth: eagerLoad.maxDepth,
                    }, [...currentRelationPath, immediateRelation]);
                }
            }
        }
    }
    async loadHasOneRelation(results, relationName, relation, relationModel, primaryKey) {
        const foreignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
        const localKey = relation.localKey || primaryKey;
        // Get all parent IDs
        const parentIds = results.map((result) => result[localKey]);
        if (parentIds.length === 0)
            return;
        // Fetch all related models at once
        const relatedModels = await relationModel.whereIn(foreignKey, parentIds).get();
        // Map related models by foreign key
        const relatedMap = new Map();
        for (const model of relatedModels) {
            relatedMap.set(model[foreignKey], model);
        }
        // Assign related models to parents
        for (const result of results) {
            result[relationName] = relatedMap.get(result[localKey]) || null;
        }
    }
    async loadHasManyRelation(results, relationName, relation, relationModel, primaryKey) {
        const foreignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
        const localKey = relation.localKey || primaryKey;
        // Get all parent IDs
        const parentIds = results.map((result) => result[localKey]);
        if (parentIds.length === 0)
            return;
        // Fetch all related models at once
        const relatedModels = await relationModel.whereIn(foreignKey, parentIds).get();
        // Group related models by foreign key
        const relatedMap = new Map();
        for (const model of relatedModels) {
            if (!relatedMap.has(model[foreignKey])) {
                relatedMap.set(model[foreignKey], []);
            }
            relatedMap.get(model[foreignKey]).push(model);
        }
        // Assign related models to parents
        for (const result of results) {
            result[relationName] = relatedMap.get(result[localKey]) || [];
        }
    }
    async loadBelongsToRelation(results, relationName, relation, relationModel) {
        const foreignKey = relation.foreignKey || `${relation.model.name.toLowerCase()}_id`;
        const ownerKey = relation.localKey || relationModel.primaryKey;
        // Get all foreign keys
        const foreignKeys = results
            .map((result) => result[foreignKey])
            .filter((value, index, self) => value !== undefined && value !== null && self.indexOf(value) === index);
        if (foreignKeys.length === 0)
            return;
        // Fetch all related models at once
        const relatedModels = await relationModel.whereIn(ownerKey, foreignKeys).get();
        // Map related models by owner key
        const relatedMap = new Map();
        for (const model of relatedModels) {
            relatedMap.set(model[ownerKey], model);
        }
        // Assign related models to parents
        for (const result of results) {
            result[relationName] = relatedMap.get(result[foreignKey]) || null;
        }
    }
    async loadBelongsToManyRelation(results, relationName, relation, relationModel, primaryKey) {
        const pivotTable = relation.pivotTable || `${this.constructor.name.toLowerCase()}_${relation.model.name.toLowerCase()}`;
        const currentForeignKey = relation.foreignKey || `${this.constructor.name.toLowerCase()}_id`;
        const relatedKey = relation.relatedKey || `${relation.model.name.toLowerCase()}_id`;
        // Get all parent IDs
        const parentIds = results.map((result) => result[primaryKey]);
        if (parentIds.length === 0)
            return;
        // Fetch all pivot records at once
        const pivotQuery = `SELECT ${currentForeignKey}, ${relatedKey} FROM ${pivotTable} WHERE ${currentForeignKey} IN (${parentIds
            .map(() => "?")
            .join(",")})`;
        const pivotRows = await this.executeQuery(pivotQuery, parentIds);
        // Group related IDs by parent ID
        const relatedIdsMap = new Map();
        const allRelatedIds = [];
        for (const row of pivotRows) {
            if (!relatedIdsMap.has(row[currentForeignKey])) {
                relatedIdsMap.set(row[currentForeignKey], []);
            }
            relatedIdsMap.get(row[currentForeignKey]).push(row[relatedKey]);
            allRelatedIds.push(row[relatedKey]);
        }
        if (allRelatedIds.length === 0) {
            // No relations found, set empty arrays for all parents
            for (const result of results) {
                result[relationName] = [];
            }
            return;
        }
        // Fetch all related models at once
        const uniqueRelatedIds = [...new Set(allRelatedIds)];
        const relatedModels = await relationModel.whereIn(relationModel.primaryKey, uniqueRelatedIds).get();
        // Map related models by their primary key
        const relatedModelsMap = new Map();
        for (const model of relatedModels) {
            relatedModelsMap.set(model[relationModel.primaryKey], model);
        }
        // Assign related models to parents
        for (const result of results) {
            const relatedIds = relatedIdsMap.get(result[primaryKey]) || [];
            result[relationName] = relatedIds.map((id) => relatedModelsMap.get(id)).filter((model) => model !== undefined);
        }
    }
    // Also need to modify the get() and first() methods to process eager loading:
    async get(options) {
        const results = await this.executeWhereQuery();
        if (options?.chunkSize && results.length > options.chunkSize) {
            const chunks = [];
            for (let i = 0; i < results.length; i += options.chunkSize) {
                const chunk = results.slice(i, i + options.chunkSize);
                chunks.push(...(await this.processEagerLoad(chunk)));
            }
            return chunks;
        }
        return this.processEagerLoad(results);
    }
    async first() {
        this.limit(1);
        const results = await this.executeWhereQuery();
        if (results.length === 0)
            return null;
        const processed = await this.processEagerLoad([results[0]]);
        return processed[0];
    }
    /**
     * Count all results matching the current query conditions
     */
    async countAllResults() {
        let sql = `SELECT COUNT(*) AS count FROM ${this.table}`;
        const values = [];
        const whereClauses = this.buildWhereClauses();
        if (whereClauses.sql) {
            sql += ` WHERE ${whereClauses.sql}`;
            values.push(...whereClauses.params);
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
    where(field, ...args) {
        if (args.length === 1) {
            // where("col", value)
            const value = args[0];
            return this.addWhereCondition(field, "=", value);
        }
        else if (args.length === 2) {
            // where("col", operator, value)
            const operator = args[0];
            const value = args[1];
            return this.addWhereCondition(field, operator, value);
        }
        else {
            throw new Error("Invalid where syntax. Use where(field, value) or where(field, operator, value)");
        }
    }
    // Specific where methods for common cases
    whereNull(field) {
        return this.addWhereCondition(field, "IS NULL");
    }
    whereNotNull(field) {
        return this.addWhereCondition(field, "IS NOT NULL");
    }
    whereIn(field, values) {
        return this.addWhereCondition(field, "IN", values);
    }
    whereBetween(field, range) {
        return this.addWhereCondition(field, "BETWEEN", range);
    }
    whereGroup(callback) {
        this.whereGroupLevel++;
        callback(this);
        this.whereGroupLevel--;
        // Move grouped conditions to main stack
        if (this.whereGroupLevel === 0 && this.whereGroupConditions.length) {
            this.whereConditions.push({
                type: "group",
                conditions: [...this.whereGroupConditions],
                conjunction: "AND",
            });
            this.whereGroupConditions = [];
        }
        return this;
    }
    orWhereGroup(callback) {
        this.whereGroupLevel++;
        callback(this);
        this.whereGroupLevel--;
        if (this.whereGroupLevel === 0 && this.whereGroupConditions.length) {
            this.whereConditions.push({
                type: "group",
                conditions: [...this.whereGroupConditions],
                conjunction: "OR",
            });
            this.whereGroupConditions = [];
        }
        return this;
    }
    whereExists(subquery) {
        const subqueryBuilder = new this.constructor();
        subquery(subqueryBuilder);
        const [sql, params] = subqueryBuilder.buildSelect();
        return this.addWhereConditionRaw(`EXISTS (${sql})`, params);
    }
    whereNotExists(subquery) {
        const subqueryBuilder = new this.constructor();
        subquery(subqueryBuilder);
        const [sql, params] = subqueryBuilder.buildSelect();
        return this.addWhereConditionRaw(`NOT EXISTS (${sql})`, params);
    }
    addWhereCondition(field, operator, value, conjunction = "AND") {
        const condition = {
            field,
            operator,
            value,
            conjunction,
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
    whereRaw(sql, params = []) {
        const fieldRegex = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
        const fields = sql.match(fieldRegex) || [];
        fields.forEach((field) => {
            if (!this.allowedFields.includes(field) && field !== this.primaryKey) {
                throw new Error(`Field ${field} is not allowed in raw where clause`);
            }
        });
        // Also validate the SQL contains no dangerous keywords
        const dangerousKeywords = ["DROP", "DELETE", "TRUNCATE", "INSERT", "UPDATE", "GRANT"];
        if (dangerousKeywords.some((kw) => sql.toUpperCase().includes(kw))) {
            throw new Error("Potentially dangerous SQL detected");
        }
        this.whereConditionsRaw.push({ sql, params });
        return this;
    }
    buildWhereClauses() {
        const params = [];
        const clauses = [];
        console.log(`clauses: ${JSON.stringify(clauses)}`);
        // Process all conditions
        for (const condition of this.whereConditions) {
            if (condition.type === "group") {
                const groupSql = this.buildConditionGroup(condition, params);
                clauses.push(groupSql);
                console.log(`Adding group condition: ${groupSql}`);
            }
            else {
                // Handle single conditions
                console.log(`Adding single condition: ${JSON.stringify(condition)}`);
                const conditionSql = this.buildSingleCondition(condition, params);
                clauses.push(conditionSql);
            }
        }
        // Add raw conditions
        for (const raw of this.whereConditionsRaw) {
            console.log(`Adding raw condition: ${JSON.stringify(raw)}`);
            clauses.push(raw.sql);
            params.push(...raw.params);
        }
        console.log(`Building WHERE clauses: ${JSON.stringify(clauses)} `, clauses.length);
        return {
            sql: clauses.length > 0 ? ` ${clauses.join(" AND ")}` : undefined,
            params,
        };
    }
    buildSingleCondition(condition, params) {
        const { field, operator, value } = condition;
        switch (operator) {
            case "IN":
            case "NOT IN":
                params.push(...value);
                return `${field} ${operator} (${value.map(() => "?").join(",")})`;
            case "BETWEEN":
            case "NOT BETWEEN":
                params.push(...value);
                return `${field} ${operator} ? AND ?`;
            case "IS NULL":
            case "IS NOT NULL":
                return `${field} ${operator}`;
            default:
                params.push(value);
                return `${field} ${operator} ?`;
        }
    }
    whereJsonContains(field, value) {
        if (BaseModel.dbConfig.client === "mysql") {
            return this.whereRaw(`JSON_CONTAINS(${field}, ?)`, [JSON.stringify(value)]);
        }
        else {
            // SQLite/SQL Server/PostgreSQL variants
            return this.whereRaw(`${field} @> ?::jsonb`, [JSON.stringify(value)]);
        }
    }
    whereJsonLength(field, operator, length) {
        if (BaseModel.dbConfig.client === "mysql") {
            return this.whereRaw(`JSON_LENGTH(${field}) ${operator} ?`, [length]);
        }
        else {
            return this.whereRaw(`jsonb_array_length(${field}) ${operator} ?`, [length]);
        }
    }
    whereDate(field, operator, value) {
        const dateValue = value instanceof Date ? value.toISOString().split("T")[0] : value;
        return this.whereRaw(`DATE(${field}) ${operator} ?`, [dateValue]);
    }
    whereTime(field, operator, value) {
        const timeValue = value instanceof Date ? value.toISOString().split("T")[1].split(".")[0] : value;
        return this.whereRaw(`TIME(${field}) ${operator} ?`, [timeValue]);
    }
    whereFullText(fields, query, mode = "natural") {
        if (BaseModel.dbConfig.client === "mysql") {
            return this.whereRaw(`MATCH(${fields.join(",")}) AGAINST(? ${mode === "boolean" ? "IN BOOLEAN MODE" : ""})`, [query]);
        }
        else {
            // PostgreSQL/SQLite variants
            return this.whereRaw(`to_tsvector(${fields.join(" || ' ' || ")}) @@ ${mode === "boolean" ? "plain" : "to"}to_tsquery(?)`, [query]);
        }
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
        if (whereClauses.sql) {
            sql += ` WHERE ${whereClauses.sql}`;
            values.push(...whereClauses.params);
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
    static hasOne({ model, foreignKey, localKey, as }) {
        const relationName = as || model.name;
        this.relations[relationName] = {
            type: interfaces_1.RelationType.HAS_ONE,
            model,
            foreignKey,
            localKey,
        };
    }
    static hasMany({ model, foreignKey, localKey, as }) {
        const relationName = as || model.name;
        this.relations[relationName] = {
            type: interfaces_1.RelationType.HAS_MANY,
            model,
            foreignKey,
            localKey,
        };
    }
    static belongsTo({ model, foreignKey, ownerKey, as }) {
        const relationName = as || model.name;
        this.relations[relationName] = {
            type: interfaces_1.RelationType.BELONGS_TO,
            model,
            foreignKey,
            localKey: ownerKey,
        };
    }
    static belongsToMany({ model, foreignKey, pivotTable, relatedKey, as, }) {
        const relationName = as || model.name;
        this.relations[relationName] = {
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
    async update(arg1, arg2, arg3) {
        let data;
        let id = null;
        let column = null;
        if (typeof arg1 === "object" && !Array.isArray(arg1)) {
            // update(data)
            data = arg1;
        }
        else {
            // update(id, data [, column])
            id = arg1;
            data = arg2;
            column = arg3 || null;
        }
        await this.validate(data, true);
        await this.beforeUpdate(data);
        await this.setTimestamps(data, true);
        const keyColumn = column || this.primaryKey;
        const filteredData = this.filterAllowedFields(data);
        const setClause = Object.keys(filteredData)
            .map((field) => `${field} = ?`)
            .join(", ");
        const values = Object.values(filteredData);
        let whereParts = [];
        let whereValues = [];
        if (id !== null) {
            if (Array.isArray(id)) {
                if (id.length === 0) {
                    throw new Error("Empty array of IDs provided");
                }
                const placeholders = id.map(() => "?").join(", ");
                whereParts.push(`${keyColumn} IN (${placeholders})`);
                whereValues.push(...id);
            }
            else {
                whereParts.push(`${keyColumn} = ?`);
                whereValues.push(id);
            }
        }
        const queryBuilderWhere = this.buildWhereClauses();
        if (queryBuilderWhere.sql) {
            whereParts.push(queryBuilderWhere.sql);
            whereValues.push(...queryBuilderWhere.params);
        }
        if (whereParts.length === 0) {
            throw new Error("No WHERE condition provided for update. Refusing to update the entire table.");
        }
        const whereClause = `WHERE ${whereParts.join(" AND ")}`;
        const sql = `UPDATE ${this.table} SET ${setClause} ${whereClause}`;
        const result = await this.executeUpdate(sql, [...values, ...whereValues]);
        await this.afterUpdate(filteredData);
        return result > 0;
    }
    async delete(arg1, arg2) {
        await this.beforeDelete();
        let id = null;
        let column = null;
        if (arg1 === undefined) {
            // delete() with builder
            id = null;
        }
        else {
            // delete(id [, column])
            id = arg1;
            column = arg2 || null;
        }
        const keyColumn = column || this.primaryKey;
        if (id !== null && !this.allowedFields.includes(keyColumn)) {
            throw new Error(`Column ${keyColumn} is not allowed for deletion.`);
        }
        let whereParts = [];
        let whereValues = [];
        if (id !== null) {
            if (Array.isArray(id)) {
                if (id.length === 0) {
                    throw new Error("Empty array of IDs provided");
                }
                const placeholders = id.map(() => "?").join(", ");
                whereParts.push(`${keyColumn} IN (${placeholders})`);
                whereValues.push(...id);
            }
            else {
                whereParts.push(`${keyColumn} = ?`);
                whereValues.push(id);
            }
        }
        const queryBuilderWhere = this.buildWhereClauses();
        if (queryBuilderWhere.sql) {
            whereParts.push(queryBuilderWhere.sql);
            whereValues.push(...queryBuilderWhere.params);
        }
        if (whereParts.length === 0) {
            throw new Error("No WHERE condition provided for delete. Refusing to delete the entire table.");
        }
        const whereClause = `WHERE ${whereParts.join(" AND ")}`;
        const sql = `DELETE FROM ${this.table} ${whereClause}`;
        await this.executeQuery(sql, whereValues);
        await this.afterDelete();
        return true;
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
