import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import logger from "../utils/logger";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(err.message, { stack: err.stack });
  sendError(res, err.message || "Internal server error", 500);
};
