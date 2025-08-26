import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// Import session types
import 'cookie-session';

interface UserPayload {
  id: string;
}

// How we can change an existing type defenition from request
declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

export const currentUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.jwt) {
    return next();
  }

  try {
    const payload = jwt.verify(
      req.session.jwt,
      process.env.JWT_KEY!
    ) as UserPayload;
    req.currentUser = payload;
  } catch (err) {}

  next();
};
