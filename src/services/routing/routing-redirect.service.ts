import { buildSupplierEntryUrl } from "../../utils/supplier-entry-url";

export const routingRedirectService = {
  buildSupplierRedirectUrl(
    externalSurveyUrl: string,
    trackingParameterName: string,
    sessionToken: string
  ): string {
    return buildSupplierEntryUrl(externalSurveyUrl, trackingParameterName, sessionToken);
  }
};
