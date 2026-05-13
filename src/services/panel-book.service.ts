import { PanelBookLead } from "../models/PanelBookLead";
import { PanelBookAssetMeta } from "../models/PanelBookAssetMeta";

type PanelBookListParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export const panelBookService = {
  createLead: (payload: Record<string, unknown>) => PanelBookLead.create(payload),

  listLeads: async (params: PanelBookListParams) => {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20)));
    const filter: Record<string, unknown> = {};
    if (params.search?.trim()) {
      const escaped = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { firstName: { $regex: escaped, $options: "i" } },
        { lastName: { $regex: escaped, $options: "i" } },
        { workEmail: { $regex: escaped, $options: "i" } },
        { companyName: { $regex: escaped, $options: "i" } },
        { jobTitle: { $regex: escaped, $options: "i" } }
      ];
    }
    const [items, total] = await Promise.all([
      PanelBookLead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      PanelBookLead.countDocuments(filter)
    ]);
    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    };
  },

  upsertAssetMeta: async (originalFileName: string, fileSizeBytes: number, mimeType: string) => {
    return PanelBookAssetMeta.findOneAndUpdate(
      { singletonKey: "default" },
      {
        $set: {
          originalFileName,
          fileSizeBytes,
          mimeType
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  },

  getAssetMeta: async () => {
    return PanelBookAssetMeta.findOne({ singletonKey: "default" }).lean();
  }
};
