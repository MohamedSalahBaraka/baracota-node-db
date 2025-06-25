"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterDelete = exports.BeforeDelete = exports.AfterUpdate = exports.BeforeUpdate = exports.AfterCreate = exports.BeforeCreate = void 0;
/**
 * Decorator to register a before create hook
 */
function BeforeCreate() {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        target.constructor.beforeCreate = async function (data) {
            await originalMethod.call(this, data);
        };
    };
}
exports.BeforeCreate = BeforeCreate;
/**
 * Decorator to register an after create hook
 */
function AfterCreate() {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        target.constructor.afterCreate = async function (data) {
            await originalMethod.call(this, data);
        };
    };
}
exports.AfterCreate = AfterCreate;
// Similar decorators for update/delete hooks
function BeforeUpdate() {
    /* ... */
}
exports.BeforeUpdate = BeforeUpdate;
function AfterUpdate() {
    /* ... */
}
exports.AfterUpdate = AfterUpdate;
function BeforeDelete() {
    /* ... */
}
exports.BeforeDelete = BeforeDelete;
function AfterDelete() {
    /* ... */
}
exports.AfterDelete = AfterDelete;
