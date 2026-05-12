export function toContactQueryDto(item: unknown) {
  const plain =
    typeof item === "object" && item !== null && "toObject" in item
      ? ((item as { toObject: () => Record<string, unknown> }).toObject() as Record<string, unknown>)
      : ((item as Record<string, unknown>) ?? {});
  const id = plain._id ?? plain.id;
  return {
    id: String(id),
    name: plain.name ?? "",
    email: plain.email ?? "",
    subject: plain.subject ?? "",
    message: plain.message ?? "",
    status: plain.status ?? "unread",
    starred: Boolean(plain.starred),
    archived: Boolean(plain.archived),
    labels: Array.isArray(plain.labels) ? plain.labels : [],
    source: plain.source ?? "contact_page",
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
}
