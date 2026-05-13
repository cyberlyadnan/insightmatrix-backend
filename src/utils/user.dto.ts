import { getPanelPrescreenBundle } from "../services/panel-prescreen.service";

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
    isActive: plain.isActive !== false,
    deletionRequested: Boolean(plain.deletionRequested),
    deletionRequestedAt: plain.deletionRequestedAt ?? null,
    deletionRequestReason: plain.deletionRequestReason ?? null,
    deactivatedAt: plain.deactivatedAt ?? null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

/** Adds member prescreen gating fields for the authenticated client. */
export async function enrichAuthUser(user: unknown) {
  const base = toPublicUser(user);
  if (!base) return null;

  const plain =
    typeof user === "object" && user !== null && "toObject" in user && typeof (user as { toObject: () => unknown }).toObject === "function"
      ? ((user as { toObject: () => Record<string, unknown> }).toObject() as Record<string, unknown>)
      : ({ ...(user as Record<string, unknown>) } as Record<string, unknown>);

  const rawId = plain._id ?? plain.id ?? base.id;
  const userId = rawId != null && rawId !== "" ? String(rawId) : "";

  if (!userId || userId === "undefined") {
    return {
      ...base,
      needsPanelPrescreen: false,
      panelPrescreenNotConfigured: false
    };
  }

  const role = (typeof plain.role === "string" ? plain.role : base.role) as string | undefined;
  const bundle = await getPanelPrescreenBundle(userId, role);
  return {
    ...base,
    needsPanelPrescreen: bundle.needsCompletion,
    panelPrescreenNotConfigured: bundle.notConfigured
  };
}
