import { z } from 'zod';

export const queryParamSchema = z.object({
  target: z.enum(['primary', 'replica']).default('primary'),
  queryKey: z.string().min(1).max(80),
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).max(5).default([])
});

export const benchmarkRequestSchema = z.object({
  queryKey: z.string().min(1).max(80),
  iterations: z.number().int().min(1).max(25).default(10),
  order: z.enum(['sequential', 'alternating']).default('alternating')
});

export const writeDemoSchema = z.object({
  employee_name: z.string().min(1).max(120),
  department: z.string().min(1).max(100),
  salary: z.number().finite().min(0).max(2000000)
});

export const replicationDemoSchema = z.object({
  employee_name: z.string().min(1).max(120).optional(),
  department: z.string().min(1).max(100).optional(),
  salary: z.number().finite().min(0).max(2000000).optional()
});
