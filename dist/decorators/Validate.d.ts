/**
 * Decorator factory for validation rules
 */
export declare function Validator(): {
    /**
     * Validate field is required
     */
    Required: () => PropertyDecorator;
    /**
     * Validate string length
     */
    Length: (min: number, max?: number) => PropertyDecorator;
    /**
     * Validate email format
     */
    Email: () => PropertyDecorator;
    /**
     * Custom validation rule
     */
    Rule: (validator: Function, message?: string) => PropertyDecorator;
};
export declare const Required: () => PropertyDecorator, Length: (min: number, max?: number) => PropertyDecorator, Email: () => PropertyDecorator, Rule: (validator: Function, message?: string) => PropertyDecorator;
