import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'chitfund-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`Login failed: User "${username}" not found`);
          return done(null, false);
        }
        
        console.log(`User found: id=${user.id}, role=${user.role}, managerId=${user.managerId || 'null'}`);
        
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          console.log(`Login failed: Invalid password for user "${username}"`);
          return done(null, false);
        }
        
        console.log(`Login successful for user "${username}" (id=${user.id}, role=${user.role})`);
        return done(null, user);
      } catch (error) {
        console.error(`Login error for username "${username}":`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if the current user is a manager (if authenticated)
      if (req.isAuthenticated() && req.user?.role !== 'manager') {
        return res.status(403).send("Only managers can register new users");
      }

      // Only allow customer creation if the request is from an authenticated manager
      if (req.body.role === 'customer' && (!req.isAuthenticated() || req.user?.role !== 'manager')) {
        return res.status(403).send("Only managers can create customer accounts");
      }

      // Only allow manager creation if there's no authenticated user (initial setup)
      if (req.body.role === 'manager' && req.isAuthenticated()) {
        return res.status(403).send("Cannot create manager accounts while logged in");
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // Create user
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isFirstLogin: true
      });

      if (req.isAuthenticated()) {
        // If creating a customer from a manager account, don't log in as the customer
        res.status(201).json(user);
      } else {
        // Otherwise, log in as the newly created user
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(user);
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("GET /api/user: User not authenticated");
      return res.sendStatus(401);
    }
    
    // Logging user data for debugging
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    console.log(`GET /api/user: Returning data for authenticated user:`, JSON.stringify({
      id: userWithoutPassword.id,
      username: userWithoutPassword.username,
      role: userWithoutPassword.role,
      managerId: userWithoutPassword.managerId || null
    }));
    
    res.json(req.user);
  });

  // Reset password for first login
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("Not authenticated");
      }

      const user = req.user;
      if (!user) {
        return res.status(401).send("User not found");
      }

      // Hash new password
      const hashedPassword = await hashPassword(req.body.newPassword);

      // Update password and first login status
      const updatedUser = await storage.updateUser(user.id, { 
        password: hashedPassword,
        isFirstLogin: false
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  });
}