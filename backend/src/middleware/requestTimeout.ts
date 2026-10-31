import type { NextFunction, Request, Response } from 'express';

export const requestTimeout = (timeoutMs = 15000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timed out.',
          timeoutMs
        });
      }
    }, timeoutMs);

    const originalEnd = res.end.bind(res);
    res.end = (...args: any[]) => {
      clearTimeout(timer);
      return originalEnd(...args);
    };

    req.on('close', () => clearTimeout(timer));
    next();
  };
};
