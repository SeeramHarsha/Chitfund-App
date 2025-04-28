import { User } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number;  // User ID stored in session
    };
  }
}

declare module 'express' {
  interface Request {
    user?: User;  // Making TypeScript aware that user may exist on request
  }
}