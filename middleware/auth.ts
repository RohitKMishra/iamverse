import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";

//authenticated user
export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token as string;
    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    const decoded = jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;
    if (!decoded) {
      return next(new ErrorHandler("access token is not valid", 400));
    }

    const user = await redis.get(decoded.id);
    if (!user) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    req.user = JSON.parse(user);
    next();
  }
);

// import express, { Request, Response, NextFunction } from "express";
// import { CatchAsyncError } from "./catchAsyncError";
// import ErrorHandler from "../utils/ErrorHandler";
// import jwt, { JwtPayload } from "jsonwebtoken";
// import { redis } from "../utils/redis";
// import cookieParser from "cookie-parser";

// const app = express();
// app.use(cookieParser());

// //authenticated user
// export const isAuthenticated = CatchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const access_token = req.cookies.access_token as string;
//     console.log("Access Token:", access_token);
//     if (!access_token) {
//       return next(
//         new ErrorHandler("Please login to access this resource", 400)
//       );
//     }

//     try {
//       const decoded = jwt.verify(
//         access_token,
//         process.env.ACCESS_TOKEN as string
//       ) as JwtPayload;

//       console.log("Decoded Token:", decoded);

//       if (!decoded) {
//         return next(new ErrorHandler("Access token is not valid", 400));
//       }

//       const user = await redis.get(decoded.id);
//       console.log("User from Redis:", user);
//       if (!user) {
//         return next(new ErrorHandler("User not found", 400));
//       }

//       req.user = JSON.parse(user);
//       console.log("User in req:", req.user);
//       next();
//     } catch (error) {
//       // Handle token verification errors
//       console.error("Token Verification Error:", error);
//       return next(new ErrorHandler("Error verifying access token", 500));
//     }
//   }
// );

//validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Role:${req.user?.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};
