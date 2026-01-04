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

export { Warning, ValidationResult, StringifyResult, BenchmarkResult, OptimizerOptions };

export default class JSONOptimizer {
  constructor(options?: OptimizerOptions);
  validate(obj: any, replacer?: ((key: string, value: any) => any) | null, space?: string | number | null): ValidationResult;
  optimize(obj: any): any;
  stringify(obj: any, replacer?: ((key: string, value: any) => any) | null, space?: string | number | null): StringifyResult;
  benchmark(obj: any, iterations?: number): BenchmarkResult;
}
