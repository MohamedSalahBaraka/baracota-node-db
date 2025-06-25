// src/database/factory.ts
import { Pool, PoolConnection, createPool } from "mysql2/promise";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { DatabaseConfig, DatabaseConnection, MysqlConnectionConfig, SqliteConnectionConfig } from "../types/interfaces";

export class DatabaseFactory {
  static async createConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
    switch (config.client) {
      case "mysql":
        return new MysqlAdapter(config.connection as MysqlConnectionConfig);
      case "sqlite":
        return new SqliteAdapter(config.connection as SqliteConnectionConfig);
      default:
        throw new Error(`Unsupported database client: ${config.client}`);
    }
  }
}

class MysqlAdapter implements DatabaseConnection {
  private pool: Pool;

  constructor(config: MysqlConnectionConfig) {
    this.pool = createPool(config);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<[T[], any]> {
    const conn = await this.pool.getConnection();
    try {
      const [rows, fields] = await conn.query(sql, params);
      return [rows as T[], fields];
    } finally {
      conn.release();
    }
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    const conn = await this.pool.getConnection();
    try {
      return await conn.execute(sql, params);
    } finally {
      conn.release();
    }
  }

  async beginTransaction(): Promise<void> {
    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
  }

  async commit(): Promise<void> {
    const conn = await this.pool.getConnection();
    await conn.commit();
    conn.release();
  }

  async rollback(): Promise<void> {
    const conn = await this.pool.getConnection();
    await conn.rollback();
    conn.release();
  }

  async release(): Promise<void> {
    // Connection pooling handles release automatically
  }
}

class SqliteAdapter implements DatabaseConnection {
  private db: Database;
  private config: SqliteConnectionConfig;
  constructor(config: SqliteConnectionConfig) {
    this.db = {} as Database; // Will be initialized in connect()
    this.config = config;
  }

  async connect(): Promise<void> {
    this.db = await open({
      filename: (this.config as SqliteConnectionConfig).filename,
      driver: sqlite3.Database,
    });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<[T[], any]> {
    const result = (await this.db.all<T>(sql, params)) as T[];
    return [result, {}];
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    return this.db.run(sql, params);
  }

  async beginTransaction(): Promise<void> {
    await this.db.run("BEGIN TRANSACTION");
  }

  async commit(): Promise<void> {
    await this.db.run("COMMIT");
  }

  async rollback(): Promise<void> {
    await this.db.run("ROLLBACK");
  }

  async release(): Promise<void> {
    await this.db.close();
  }
}
