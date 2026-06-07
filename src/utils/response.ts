import { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = "Success",
  statusCode = 200,
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown,
): Response => {
  const body: Record<string, unknown> = { success: false, message };
  if (errors !== undefined) {
    body.errors = errors;
  }
  return res.status(statusCode).json(body);
};
