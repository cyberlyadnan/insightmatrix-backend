import { apiClient } from "./client";

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) =>
    apiClient.post("/auth/register", payload),
  login: (payload: { email: string; password: string }) => apiClient.post("/auth/login", payload),
  logout: () => apiClient.post("/auth/logout")
};

export const surveyApi = {
  list: () => apiClient.get("/surveys"),
  create: (payload: unknown) => apiClient.post("/surveys", payload),
  publish: (id: string) => apiClient.patch(`/surveys/${id}/publish`)
};

export const responseApi = {
  submit: (payload: unknown) => apiClient.post("/responses", payload),
  listBySurvey: (surveyId: string) => apiClient.get(`/responses/${surveyId}`)
};
