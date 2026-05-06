/** Strip secrets and normalize `_id` → `id` for JSON responses */

export const toPublicUser = (user: unknown) => {
  if (!user) return null;
  const plain =
    typeof user === "object" && user !== null && "toObject" in user && typeof (user as { toObject: () => unknown }).toObject === "function"
      ? ((user as { toObject: () => Record<string, unknown> }).toObject() as Record<string, unknown>)
      : ({ ...(user as Record<string, unknown>) } as Record<string, unknown>);

  delete plain.password;
  delete plain.emailVerificationToken;

  const id = plain._id ?? plain.id;
  return {
    id: String(id),
    fullName: plain.fullName ?? plain.name ?? "",
    email: plain.email,
    role: plain.role,
    isVerified: Boolean(plain.isVerified),
    avatar: plain.avatar ?? null,
    status: plain.status ?? "active",
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};
