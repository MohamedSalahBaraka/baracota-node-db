"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule = exports.Email = exports.Length = exports.Required = exports.Validator = void 0;
const class_validator_1 = require("class-validator");
/**
 * Decorator factory for validation rules
 */
function Validator() {
    return {
        /**
         * Validate field is required
         */
        Required: () => (0, class_validator_1.IsDefined)({
            message: "$property is required",
        }),
        /**
         * Validate string length
         */
        Length: (min, max) => (0, class_validator_1.Length)(min, max, {
            message: `$property must be between ${min} and ${max || "unlimited"} characters`,
        }),
        /**
         * Validate email format
         */
        Email: () => (0, class_validator_1.IsEmail)(undefined, {
            message: "$property must be a valid email",
        }),
        /**
         * Custom validation rule
         */
        Rule: (validator, message) => (0, class_validator_1.Validate)(validator, {
            message: message || "$property validation failed",
        }),
    };
}
exports.Validator = Validator;
_a = Validator(), exports.Required = _a.Required, exports.Length = _a.Length, exports.Email = _a.Email, exports.Rule = _a.Rule;
