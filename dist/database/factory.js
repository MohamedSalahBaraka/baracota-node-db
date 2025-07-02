"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseFactory = void 0;
// src/database/factory.ts
const promise_1 = require("mysql2/promise");
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
class DatabaseFactory {
    static async createConnection(config) {
        switch (config.client) {
            case "mysql":
                return new MysqlAdapter(config.connection);
            case "sqlite":
                const adapter = new SqliteAdapter(config.connection);
                await adapter.connect(); // 👈 make sure connection is opened
                return adapter;
            default:
                throw new Error(`Unsupported database client: ${config.client}`);
        }
    }
}
exports.DatabaseFactory = DatabaseFactory;
class MysqlAdapter {
    constructor(config) {
        this.pool = (0, promise_1.createPool)(config);
    }
    async query(sql, params) {
        const conn = await this.pool.getConnection();
        try {
            const [rows, fields] = await conn.query(sql, params);
            return [rows, fields];
        }
        finally {
            conn.release();
        }
    }
    async execute(sql, params) {
        const conn = await this.pool.getConnection();
        try {
            return await conn.execute(sql, params);
        }
        finally {
            conn.release();
        }
    }
    async beginTransaction() {
        const conn = await this.pool.getConnection();
        await conn.beginTransaction();
    }
    async commit() {
        const conn = await this.pool.getConnection();
        await conn.commit();
        conn.release();
    }
    async rollback() {
        const conn = await this.pool.getConnection();
        await conn.rollback();
        conn.release();
    }
    async release() {
        // Connection pooling handles release automatically
    }
}
class SqliteAdapter {
    constructor(config) {
        this.db = {}; // Will be initialized in connect()
        this.config = config;
    }
    async connect() {
        this.db = await (0, sqlite_1.open)({
            filename: this.config.filename,
            driver: sqlite3_1.default.Database,
        });
    }
    async query(sql, params) {
        console.log(`Executing SQL: "${sql}" with params: ${params ? JSON.stringify(params) : "[]"}`);
        const result = (await this.db.all(sql, params));
        return [result, {}];
    }
    async execute(sql, params) {
        console.log(`Executing SQL: "${sql}" with params: ${params ? JSON.stringify(params) : "[]"}`);
        return this.db.run(sql, params);
    }
    async beginTransaction() {
        await this.db.run("BEGIN TRANSACTION");
    }
    async commit() {
        await this.db.run("COMMIT");
    }
    async rollback() {
        await this.db.run("ROLLBACK");
    }
    async release() {
        await this.db.close();
    }
}
