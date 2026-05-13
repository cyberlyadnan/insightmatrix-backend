type PlainObject = Record<string, unknown>;

function toPlain(value: unknown): PlainObject {
  if (!value) return {};
  if (typeof value === "object" && value !== null && "toObject" in value) {
    const maybeDoc = value as { toObject?: () => unknown };
    if (typeof maybeDoc.toObject === "function") {
      return (maybeDoc.toObject() as PlainObject) ?? {};
    }
  }
  return value as PlainObject;
}

export function toPrescreenDto(form: unknown) {
  const plain = toPlain(form);
  const id = plain._id ?? plain.id;
  return {
    id: String(id),
    title: plain.title ?? "",
    slug: plain.slug ?? "",
    description: plain.description ?? "",
    status: plain.status ?? "draft",
    category: plain.category ?? null,
    tags: Array.isArray(plain.tags) ? plain.tags : [],
    targetAudience: plain.targetAudience ?? {},
    visibility: plain.visibility ?? "internal",
    settings: plain.settings ?? {},
    questions: Array.isArray(plain.questions) ? plain.questions : [],
    isRequiredForPanel: Boolean(plain.isRequiredForPanel),
    createdBy: plain.createdBy ?? null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
}

export function toPrescreenCategoryDto(category: unknown) {
  const plain = toPlain(category);
  const id = plain._id ?? plain.id;
  return {
    id: String(id),
    name: plain.name ?? "",
    slug: plain.slug ?? "",
    description: plain.description ?? "",
    active: Boolean(plain.active),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
}
