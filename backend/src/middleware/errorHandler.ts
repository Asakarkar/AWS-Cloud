import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found.',
    path: req.originalUrl
  });
};

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: error.issues[0]?.message ?? 'Invalid request payload.',
      details: error.issues,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: error.message || 'An unexpected server error occurred.',
    timestamp: new Date().toISOString()
  });
};
