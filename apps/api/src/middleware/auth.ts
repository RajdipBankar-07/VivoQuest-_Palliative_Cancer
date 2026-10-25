import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { User, IUser, UserRole } from '../models/User.js';
import { AppError } from './errorHandler.js';

export interface AuthenticatedUserPayload {
  userId: string;
  role: UserRole;
  phone: string;
  email?: string;
  fullName: string;
}

export interface AuthRequest extends Request {
  user?: IUser;
  userPayload?: AuthenticatedUserPayload;
}

export const authenticateUser = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    } else if (req.headers.cookie) {
      // Parse cookie fallback: vivo_token
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map((c) => {
          const [key, ...v] = c.trim().split('=');
          return [key, decodeURIComponent(v.join('='))];
        })
      );
      token = cookies['vivo_token'];
    }

    if (!token) {
      throw new AppError('Authentication required. Missing Bearer token.', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUserPayload;
    
    // Fetch active user from database to ensure not suspended
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    if (user.status === 'suspended') {
      throw new AppError('Account is suspended. Please contact support.', 403);
    }

    req.user = user;
    req.userPayload = {
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone,
      email: user.email,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('User is not authenticated.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`,
          403
        )
      );
    }

    next();
  };
};

export const optionalAuthenticateUser = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUserPayload;
        const user = await User.findById(decoded.userId);
        if (user && user.status !== 'suspended') {
          req.user = user;
          req.userPayload = {
            userId: user._id.toString(),
            role: user.role,
            phone: user.phone,
            email: user.email,
            fullName: user.fullName,
          };
        }
      } catch {
        // Silently proceed for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
