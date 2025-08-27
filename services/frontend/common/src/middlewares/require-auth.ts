import { NextFunction, Request, Response } from 'express';

import { NotAuthorizedError } from '../errors/not-authorized-error';

declare module 'express-serve-static-core' {
  interface Request {
    currentUser?: {
      id: string;
    };
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser) {
    throw new NotAuthorizedError();
  }

  next();
};
