import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { env } from "../config/env";

export type VendorTokenPayload = {
  sub: string;
  email: string;
  principal: "vendor";
};

const accessSecret = () => env.VENDOR_JWT_ACCESS_SECRET || env.JWT_ACCESS_SECRET;
const refreshSecret = () => env.VENDOR_JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET;

export const signVendorAccessToken = (payload: Omit<VendorTokenPayload, "principal">) =>
  jwt.sign({ ...payload, principal: "vendor" as const }, accessSecret(), {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN
  });

export const signVendorRefreshToken = (payload: Omit<VendorTokenPayload, "principal">) =>
  jwt.sign({ ...payload, principal: "vendor" as const }, refreshSecret(), {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN
  });

export const verifyVendorAccessToken = (token: string): VendorTokenPayload => {
  const decoded = jwt.verify(token, accessSecret()) as VendorTokenPayload;
  if (decoded.principal !== "vendor") {
    throw new jwt.JsonWebTokenError("Invalid vendor token");
  }
  return decoded;
};

export const verifyVendorRefreshToken = (token: string): VendorTokenPayload => {
  const decoded = jwt.verify(token, refreshSecret()) as VendorTokenPayload;
  if (decoded.principal !== "vendor") {
    throw new jwt.JsonWebTokenError("Invalid vendor token");
  }
  return decoded;
};

export const getVendorRefreshTokenExpiryDate = () => dayjs().add(7, "day").toDate();
