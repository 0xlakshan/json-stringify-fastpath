# json-stringify-fastpath

Validate and optimize JavaScript objects for V8's fast-path `JSON.stringify`
(Chrome 138+, V8 13.8+).

## Performance

V8's fast-path optimization can provide **2-3x faster** JSON serialization for optimized objects:

```javascript
import JSONOptimizer from 'json-stringify-fastpath';

const optimizer = new JSONOptimizer();

// Optimized object (fast path)
const optimized = {
  name: 'John',
  age: 30,
  items: ['a', 'b', 'c']
};

// Non-optimized object (slow path)
const nonOptimized = {
  name: 'John',
  age: 30,
  toJSON() { return this; }  // Custom toJSON blocks fast path
};

const fastResult = optimizer.benchmark(optimized, 10000);
const slowResult = optimizer.benchmark(nonOptimized, 10000);

console.log(`Fast path: ${fastResult.opsPerSecond.toFixed(0)} ops/sec`);
console.log(`Slow path: ${slowResult.opsPerSecond.toFixed(0)} ops/sec`);
// Fast path: ~500,000 ops/sec
// Slow path: ~200,000 ops/sec
```

## Installation

```bash
npm install json-stringify-fastpath
