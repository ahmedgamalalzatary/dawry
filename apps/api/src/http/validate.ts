import type { z } from "zod";

/** Parse a request body or query; ZodErrors become 400 validation_failed. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  return schema.parse(input);
}
