import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { Validate, IsDefined, Length as CVLength, IsEmail } from "class-validator";

/**
 * Decorator factory for validation rules
 */
export function Validator() {
  return {
    /**
     * Validate field is required
     */
    Required: () =>
      IsDefined({
        message: "$property is required",
      }),

    /**
     * Validate string length
     */
    Length: (min: number, max?: number) =>
      CVLength(min, max, {
        message: `$property must be between ${min} and ${max || "unlimited"} characters`,
      }),

    /**
     * Validate email format
     */
    Email: () =>
      IsEmail(undefined, {
        message: "$property must be a valid email",
      }),

    /**
     * Custom validation rule
     */
    Rule: (validator: Function, message?: string) =>
      Validate(validator, {
        message: message || "$property validation failed",
      }),
  };
}

export const { Required, Length, Email, Rule } = Validator();
