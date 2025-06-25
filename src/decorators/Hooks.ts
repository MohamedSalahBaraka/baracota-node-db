/**
 * Decorator to register a before create hook
 */
export function BeforeCreate() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    target.constructor.beforeCreate = async function (data: any) {
      await originalMethod.call(this, data);
    };
  };
}

/**
 * Decorator to register an after create hook
 */
export function AfterCreate() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    target.constructor.afterCreate = async function (data: any) {
      await originalMethod.call(this, data);
    };
  };
}

// Similar decorators for update/delete hooks
export function BeforeUpdate() {
  /* ... */
}
export function AfterUpdate() {
  /* ... */
}
export function BeforeDelete() {
  /* ... */
}
export function AfterDelete() {
  /* ... */
}
