import { BaseModel } from "../BaseModel";
import { ModelConfig } from "../types/interfaces";

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
export function ModelConfig(config: Partial<ModelConfig>) {
  return function <T extends typeof BaseModel>(constructor: T) {
    constructor.config = {
      ...constructor.config,
      ...config,
    };
  };
}
