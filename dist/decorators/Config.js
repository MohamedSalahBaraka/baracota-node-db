"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelConfig = void 0;
/**
 * Decorator to configure model options
 * @param config Model configuration
 *
 * @example
 * ```typescript
 * @ModelConfig({
 *   timestamps: true,
 *   softDeletes: true
 * })
 * class User extends BaseModel {
 *   // model implementation
 * }
 * ```
 */
function ModelConfig(config) {
    return function (constructor) {
        constructor.config = {
            ...constructor.config,
            ...config,
        };
    };
}
exports.ModelConfig = ModelConfig;
