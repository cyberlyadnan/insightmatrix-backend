import { Types } from "mongoose";

/** Normalize Mongo refs (ObjectId, hex string, or populated `{ _id }`) to a 24-char hex id. */
export function extractObjectIdString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === "string") {
    const s = value.trim();
    return Types.ObjectId.isValid(s) ? s : null;
  }
  if (typeof value === "object") {
    const id = (value as { _id?: unknown })._id;
    if (id instanceof Types.ObjectId) return id.toString();
    if (typeof id === "string" && Types.ObjectId.isValid(id)) return id.trim();
  }
  return null;
}

export function toObjectId(value: unknown): Types.ObjectId | null {
  const id = extractObjectIdString(value);
  return id ? new Types.ObjectId(id) : null;
}
