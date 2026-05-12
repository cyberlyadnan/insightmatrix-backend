import mongoose from "mongoose";
import { PANEL_ROUTING_EVENT_TYPES } from '../constants/panel-survey-routing';

const panelSurveyRoutingEventSchema = new mongoose.Schema(
  {
    panelSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurvey",
      required: true,
      index: true
    },
    eventType: {
      type: String,
      enum: PANEL_ROUTING_EVENT_TYPES,
      required: true,
      index: true
    },
    /** Matches `dynamicQuotaGroups._id` when the event is attributed to a segment */
    quotaGroupId: { type: String, trim: true, maxlength: 64, default: null, index: true },
    quotaGroupName: { type: String, trim: true, maxlength: 200, default: "" },
    /** Opaque id from supplier (toid / uid) for respondent-level tracking */
    supplierParticipantRef: { type: String, trim: true, maxlength: 500, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

panelSurveyRoutingEventSchema.index({ panelSurveyId: 1, createdAt: -1 });
panelSurveyRoutingEventSchema.index({ panelSurveyId: 1, eventType: 1 });

export const PanelSurveyRoutingEvent = mongoose.model(
  "PanelSurveyRoutingEvent",
  panelSurveyRoutingEventSchema
);
