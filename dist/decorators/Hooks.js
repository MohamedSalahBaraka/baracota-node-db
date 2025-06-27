"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeforeCreate = BeforeCreate;
exports.AfterCreate = AfterCreate;
exports.BeforeUpdate = BeforeUpdate;
exports.AfterUpdate = AfterUpdate;
exports.BeforeDelete = BeforeDelete;
exports.AfterDelete = AfterDelete;
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
// Similar decorators for update/delete hooks
function BeforeUpdate() {
    /* ... */
}
function AfterUpdate() {
    /* ... */
}
function BeforeDelete() {
    /* ... */
}
function AfterDelete() {
    /* ... */
}
