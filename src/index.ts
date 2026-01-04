/**
 * fast-json-stringify
 *
 * An SDK to help devs validate and optimize their JSON structures
 * for V8's fast path JSON.stringify optimization (available in V8 13.8+/Chrome 138+)
 */

interface Warning {
  type: string;
  path?: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface ValidationResult {
  isOptimized: boolean;
  canUseFastPath: boolean;
  warnings: Warning[];
  summary: string;
}

interface StringifyResult {
  json: string;
  validation: ValidationResult;
  optimized: boolean;
}

interface BenchmarkResult {
  iterations: number;
  totalTime: number;
  averageTime: number;
  opsPerSecond: number;
  validation: ValidationResult;
}

interface OptimizerOptions {
  strict?: boolean;
}

export default class JSONOptimizer {
  private warnings: Warning[] = [];
  private strictMode: boolean;

  constructor(options: OptimizerOptions = {}) {
    this.warnings = [];
    this.strictMode = options.strict || false;
  }

  /**
   * Validates if an object can use V8's fast path for JSON.stringify
   */
  validate(obj: any, replacer: ((key: string, value: any) => any) | null = null, space: string | number | null = null): ValidationResult {
    this.warnings = [];

    if (replacer !== null) {
      this.warnings.push({
        type: 'replacer',
        message: 'Replacer function prevents fast path optimization',
        impact: 'high',
        suggestion: 'Remove replacer if possible, or transform data before serialization'
      });
    }

    if (space !== null && space !== undefined) {
      this.warnings.push({
        type: 'space',
        message: 'Space/gap argument prevents fast path optimization',
        impact: 'high',
        suggestion: 'Remove space parameter for compact serialization, or format after serialization'
      });
    }

    this._validateObject(obj, 'root');

    return {
      isOptimized: this.warnings.length === 0,
      canUseFastPath: this.warnings.filter(w => w.impact === 'high').length === 0,
      warnings: this.warnings,
      summary: this._generateSummary()
    };
  }

  private _validateObject(obj: any, path = ''): void {
    if (obj === null || obj === undefined) return;

    const type = typeof obj;

    if (type === 'string' || type === 'number' || type === 'boolean') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        this._validateObject(item, `${path}[${idx}]`);
      });
      return;
    }

    if (type === 'object') {
      if (typeof obj.toJSON === 'function') {
        this.warnings.push({
          type: 'toJSON',
          path,
          message: `Custom toJSON() method found at ${path}`,
          impact: 'high',
          suggestion: 'Remove toJSON() or call it manually before serialization'
        });
      }

      const proto = Object.getPrototypeOf(obj);
      if (proto && proto !== Object.prototype && proto !== Array.prototype) {
        if (typeof proto.toJSON === 'function') {
          this.warnings.push({
            type: 'prototype-toJSON',
            path,
            message: `Prototype has custom toJSON() at ${path}`,
            impact: 'high',
            suggestion: 'Use plain objects without custom prototypes'
          });
        }
      }

      const keys = Object.keys(obj);
      const hasIndexedProps = keys.some(key => {
        const num = Number(key);
        return !isNaN(num) && num >= 0 && String(num) === key;
      });

      if (hasIndexedProps && !Array.isArray(obj)) {
        this.warnings.push({
          type: 'indexed-properties',
          path,
          message: `Object has indexed properties at ${path}`,
          impact: 'medium',
          suggestion: 'Use arrays for indexed data or rename keys to non-numeric strings'
        });
      }

      const symbolKeys = Object.getOwnPropertySymbols(obj);
      if (symbolKeys.length > 0) {
        this.warnings.push({
          type: 'symbol-keys',
          path,
          message: `Object has Symbol keys at ${path}`,
          impact: 'low',
          suggestion: 'Symbols are ignored in JSON but slow down serialization'
        });
      }

      const allKeys = Object.getOwnPropertyNames(obj);
      const nonEnumerable = allKeys.filter(key => {
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        return desc && !desc.enumerable;
      });

      if (nonEnumerable.length > 0) {
        this.warnings.push({
          type: 'non-enumerable',
          path,
          message: `Non-enumerable properties found at ${path}: ${nonEnumerable.join(', ')}`,
          impact: 'low',
          suggestion: 'These properties slow down serialization even though they\'re not included'
        });
      }

      keys.forEach(key => {
        this._validateObject(obj[key], `${path}.${key}`);
      });
    }
  }

  private _generateSummary(): string {
    const highImpact = this.warnings.filter(w => w.impact === 'high').length;
    const mediumImpact = this.warnings.filter(w => w.impact === 'medium').length;
    const lowImpact = this.warnings.filter(w => w.impact === 'low').length;

    if (this.warnings.length === 0) {
      return 'Object is fully optimized for V8 fast path';
    }

    return `Found ${this.warnings.length} issue(s): ${highImpact} high, ${mediumImpact} medium, ${lowImpact} low impact`;
  }

  /**
   * Attempts to optimize an object for fast path serialization
   */
  optimize(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.optimize(item));
    }

    const optimized: Record<string, any> = {};
    const keys = Object.keys(obj);

    keys.forEach(key => {
      const num = Number(key);
      if (!isNaN(num) && num >= 0 && String(num) === key) {
        console.warn(`Skipping indexed property: ${key}`);
        return;
      }

      optimized[key] = this.optimize(obj[key]);
    });

    return optimized;
  }

  /**
   * Safe stringify with validation
   */
  stringify(obj: any, replacer: ((key: string, value: any) => any) | null = null, space: string | number | null = null): StringifyResult {
    const validation = this.validate(obj, replacer, space);
    const json = JSON.stringify(obj, replacer, space);

    return {
      json,
      validation,
      optimized: validation.isOptimized
    };
  }

  /**
   * Benchmark stringify performance
   */
  benchmark(obj: any, iterations = 1000): BenchmarkResult {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      JSON.stringify(obj);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;
    const validation = this.validate(obj);

    return {
      iterations,
      totalTime: end - start,
      averageTime: avgTime,
      opsPerSecond: 1000 / avgTime,
      validation
    };
  }
}
