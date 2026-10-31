import { describe, expect, it } from 'vitest';
import { benchmarkRequestSchema, queryParamSchema, writeDemoSchema } from '../validators.js';

describe('schema validation', () => {
  it('accepts valid benchmark request payloads', () => {
    const parsed = benchmarkRequestSchema.parse({ queryKey: 'employees_by_department', iterations: 5, order: 'alternating' });
    expect(parsed.iterations).toBe(5);
    expect(parsed.order).toBe('alternating');
  });

  it('rejects invalid query parameters', () => {
    expect(() => queryParamSchema.parse({ target: 'primary', queryKey: '', params: ['IT'] })).toThrow();
  });

  it('rejects invalid write payloads', () => {
    expect(() => writeDemoSchema.parse({ employee_name: '', department: 'IT', salary: 1000 })).toThrow();
  });
});
