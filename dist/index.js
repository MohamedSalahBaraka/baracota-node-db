"use strict";
// src/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = exports.createModel = exports.initORM = exports.RelationType = exports.DatabaseFactory = exports.BaseModel = void 0;
const BaseModel_1 = require("./BaseModel");
const interfaces_1 = require("./types/interfaces");
// Core exports
var BaseModel_2 = require("./BaseModel");
Object.defineProperty(exports, "BaseModel", { enumerable: true, get: function () { return BaseModel_2.BaseModel; } });
// Database configuration exports
var factory_1 = require("./database/factory");
Object.defineProperty(exports, "DatabaseFactory", { enumerable: true, get: function () { return factory_1.DatabaseFactory; } });
// Relationship exports
var interfaces_2 = require("./types/interfaces");
Object.defineProperty(exports, "RelationType", { enumerable: true, get: function () { return interfaces_2.RelationType; } });
// Default initialization function
/**
 * Initializes the ORM with database configuration
 *
 * @param config Database configuration
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```typescript
 * import { initORM } from 'your-orm-package';
 *
 * await initORM({
 *   client: 'mysql',
 *   connection: {
 *     host: 'localhost',
 *     user: 'root',
 *     password: '',
 *     database: 'test'
 *   }
 * });
 * ```
 */
async function initORM(config) {
    await BaseModel_1.BaseModel.initialize(config);
}
exports.initORM = initORM;
// Helper functions for common operations
/**
 * Creates a new model instance with the given table name
 *
 * @param tableName Name of the database table
 * @returns A class that extends BaseModel for the specified table
 *
 * @example
 * ```typescript
 * const User = createModel('users');
 * const users = await User.find(1);
 * ```
 */
function createModel(tableName) {
    return class extends BaseModel_1.BaseModel {
        constructor() {
            super(...arguments);
            this.table = tableName;
        }
    };
}
exports.createModel = createModel;
// Export transaction function directly
/**
 * Executes operations within a database transaction
 *
 * @param callback Async function containing operations to execute
 * @returns Promise that resolves with the callback's return value
 *
 * @example
 * ```typescript
 * await transaction(async (trx) => {
 *   await UserModel.insert({ name: 'John' }, trx);
 *   await AccountModel.insert({ userId: 1, balance: 100 }, trx);
 * });
 * ```
 */
async function transaction(callback) {
    return BaseModel_1.BaseModel.transaction(callback);
}
exports.transaction = transaction;
// Export all type utilities
__exportStar(require("./types/index"), exports);
// Export all decorators
__exportStar(require("./decorators/index"), exports);
// Default export for simpler imports
exports.default = {
    BaseModel: BaseModel_1.BaseModel,
    initORM,
    createModel,
    transaction,
    RelationType: interfaces_1.RelationType,
};
