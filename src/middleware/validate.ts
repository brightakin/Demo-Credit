import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/response";

// validate() is a middleware factory — you pass it a Zod schema and it returns
// an Express middleware that parses + validates req.body against that schema.
//
// On success:  req.body is replaced with the parsed (type-safe) data and next() is called.
// On failure:  a 422 response is sent with a structured list of field errors.
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, "Validation failed", 422, errors);
      return;
    }

    // Replace req.body with the validated & coerced data (e.g. strings → numbers)
    req.body = result.data;
    next();
  };

// Converts Zod's nested error format into a flat { field: message } map
// that is easy for API consumers to display in forms.
const formatZodErrors = (error: ZodError): Record<string, string> => {
  return error.issues.reduce<Record<string, string>>(
    (acc: Record<string, string>, issue) => {
      const field = issue.path.join(".") || "value";
      acc[field] = issue.message;
      return acc;
    },
    {},
  );
};
