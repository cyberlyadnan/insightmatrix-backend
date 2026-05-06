import bcrypt from "bcryptjs";

export const hashPassword = (rawPassword) => bcrypt.hash(rawPassword, 12);
export const comparePassword = (rawPassword, hashedPassword) => bcrypt.compare(rawPassword, hashedPassword);

