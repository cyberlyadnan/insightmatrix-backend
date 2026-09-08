import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";
import { userRepository, type UserFilter } from "../repositories/user.repository";
import { comparePassword, hashPassword } from "../utils/password";
import { toPublicUser } from "../utils/user.dto";
import { getPanelPrescreenBundle } from "./panel-prescreen.service";
import { listMemberSurveyHistory } from "./panel-member-history.service";
import { PanelSurveyAttempt } from "../models/PanelSurveyAttempt";

const SORT_WHITELIST = ["createdAt", "fullName", "email", "panelPoints", "status"] as const;
type SortField = (typeof SORT_WHITELIST)[number];

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  role?: string;
  verified?: string;
  prescreen?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function formatAnswerDisplay(raw: unknown, options?: { value: string; label?: string }[]): string {
  if (raw == null || raw === "") return "—";
  if (Array.isArray(raw)) {
    return raw
      .map((v) => {
        const s = String(v);
        const opt = options?.find((o) => o.value === s);
        return opt?.label || s;
      })
      .join(", ");
  }
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }
  const s = String(raw);
  const opt = options?.find((o) => o.value === s);
  return opt?.label || s;
}

function buildPrescreenAnswerRows(
  form: { questions?: unknown[] } | null,
  answers: Record<string, unknown> | null
) {
  if (!form || !Array.isArray(form.questions) || !answers) return [];

  return form.questions
    .map((qUnknown) => {
      const q = qUnknown as {
        id?: string;
        title?: string;
        type?: string;
        options?: { value: string; label?: string }[];
      };
      const id = String(q.id ?? "");
      if (!id) return null;
      const raw = answers[id];
      if (raw === undefined) return null;
      return {
        questionId: id,
        title: String(q.title ?? id),
        type: String(q.type ?? "text"),
        value: raw,
        displayValue: formatAnswerDisplay(raw, q.options),
      };
    })
    .filter(Boolean);
}

export const userService = {
  create: (payload: Record<string, unknown>) => userRepository.create(payload),

  list: async (params: ListParams = {}) => {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 25)));
    const filter: UserFilter = {};

    if (params.status) filter.status = params.status;
    if (params.role) filter.role = params.role;
    if (params.verified === "true") filter.isVerified = true;
    if (params.verified === "false") filter.isVerified = false;
    if (params.prescreen === "complete") filter.panelPrescreenCompletedAt = { $ne: null };
    if (params.prescreen === "incomplete") {
      filter.$or = [{ panelPrescreenCompletedAt: null }, { panelPrescreenCompletedAt: { $exists: false } }];
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      const searchClause = {
        $or: [
          { fullName: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
        ],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchClause];
        delete filter.$or;
      } else {
        Object.assign(filter, searchClause);
      }
    }

    const sortField: SortField = SORT_WHITELIST.includes(params.sortBy as SortField)
      ? (params.sortBy as SortField)
      : "createdAt";
    const order: 1 | -1 = params.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: order } as Record<string, 1 | -1>;

    const [items, total] = await Promise.all([
      userRepository.findPaged(filter, sort, (page - 1) * pageSize, pageSize),
      userRepository.count(filter),
    ]);

    return {
      items: items.map((u) => {
        const base = toPublicUser(u);
        const plain =
          typeof u === "object" && u !== null && "toObject" in u
            ? (u as { toObject: () => Record<string, unknown> }).toObject()
            : (u as Record<string, unknown>);
        return {
          ...base,
          panelPrescreenCompletedAt: plain.panelPrescreenCompletedAt ?? null,
          panelPrescreenFormId: plain.panelPrescreenFormId
            ? String(plain.panelPrescreenFormId)
            : null,
        };
      }),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  getById: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },

  /** Full admin detail: profile + labeled prescreen answers + recent survey history */
  getAdminDetail: async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(404, "User not found");

    const user = await userRepository.findById(id);
    if (!user) throw new ApiError(404, "User not found");

    const plain = user.toObject() as Record<string, unknown>;
    const base = toPublicUser(user);
    const role = typeof plain.role === "string" ? plain.role : String(base?.role ?? "user");

    const [bundle, panelCompletedSurveys, history] = await Promise.all([
      getPanelPrescreenBundle(id, role),
      PanelSurveyAttempt.countDocuments({
        userId: new mongoose.Types.ObjectId(id),
        status: "completed_rewarded",
      }),
      listMemberSurveyHistory(id, { limit: 25 }),
    ]);

    const answerRows = buildPrescreenAnswerRows(
      bundle.form as { questions?: unknown[] } | null,
      bundle.existingAnswers
    );

    return {
      ...base,
      panelPrescreenCompletedAt: plain.panelPrescreenCompletedAt ?? null,
      panelPrescreenFormId: plain.panelPrescreenFormId ? String(plain.panelPrescreenFormId) : null,
      needsPanelPrescreen: bundle.needsCompletion,
      panelPrescreenNotConfigured: bundle.notConfigured,
      panelCompletedSurveys,
      panelPrescreen: {
        formId: bundle.form?.id ?? null,
        formTitle: bundle.form?.title ?? null,
        needsCompletion: bundle.needsCompletion,
        notConfigured: bundle.notConfigured,
        completedAt: plain.panelPrescreenCompletedAt ?? null,
        answers: answerRows,
        rawAnswers: bundle.existingAnswers,
      },
      surveyHistory: history,
    };
  },

  updateById: async (id: string, payload: Record<string, unknown>) => {
    const user = await userRepository.updateById(id, payload);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  updatePassword: async (id: string, currentPassword: string, newPassword: string) => {
    const user = await userRepository.findByIdWithPassword(id);
    if (!user) throw new ApiError(404, "User not found");
    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new ApiError(400, "Current password is incorrect");
    user.password = await hashPassword(newPassword);
    await user.save();
    return user;
  },
  requestAccountDeletion: async (id: string, reason?: string) => {
    const user = await userRepository.updateById(id, {
      deletionRequested: true,
      deletionRequestedAt: new Date(),
      deletionRequestReason: reason?.trim() || null,
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  cancelAccountDeletionRequest: async (id: string) => {
    const user = await userRepository.updateById(id, {
      deletionRequested: false,
      deletionRequestedAt: null,
      deletionRequestReason: null,
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  listDeletionRequests: () => userRepository.listDeletionRequests(),
  approveAccountDeletion: async (id: string) => {
    const user = await userRepository.updateById(id, {
      isActive: false,
      status: "deactivated",
      deactivatedAt: new Date(),
      deletionRequested: false,
      deletionRequestedAt: null,
      deletionRequestReason: null,
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  deleteById: async (id: string) => {
    const user = await userRepository.deleteById(id);
    if (!user) throw new ApiError(404, "User not found");
  },
};
