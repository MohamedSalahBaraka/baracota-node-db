/**
 * Decorator to register a before create hook
 */
export declare function BeforeCreate(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
/**
 * Decorator to register an after create hook
 */
export declare function AfterCreate(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function BeforeUpdate(): void;
export declare function AfterUpdate(): void;
export declare function BeforeDelete(): void;
export declare function AfterDelete(): void;
