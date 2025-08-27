import { Session } from 'cookie-session';

declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
      };
      session?: Session & {
        jwt?: string;
      };
    }
  }
}
