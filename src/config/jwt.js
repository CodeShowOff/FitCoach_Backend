import dotenv from "dotenv";
dotenv.config({ quiet: true });

import jwt from "jsonwebtoken";

const normalizeAlgorithm = (value, fallback) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim().toUpperCase();
  }
  return fallback;
};

const ensureSecret = (value, envName) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${envName} environment variable is required`);
  }
  return value.trim();
};

const ACCESS_TOKEN_ALG = normalizeAlgorithm(process.env.JWT_ALGORITHM, "HS256");
const REFRESH_TOKEN_ALG = normalizeAlgorithm(
  process.env.REFRESH_TOKEN_ALGORITHM,
  "HS256"
);

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

export const getAccessTokenConfig = () => ({
  secret: ensureSecret(process.env.JWT_SECRET, "JWT_SECRET"),
  algorithm: ACCESS_TOKEN_ALG,
  expiresIn: ACCESS_TOKEN_EXPIRES_IN,
});

export const getRefreshTokenConfig = () => ({
  secret: ensureSecret(
    process.env.REFRESH_TOKEN_SECRET,
    "REFRESH_TOKEN_SECRET"
  ),
  algorithm: REFRESH_TOKEN_ALG,
  expiresIn: REFRESH_TOKEN_EXPIRES_IN,
});

export const signAccessToken = (payload) => {
  const { secret, algorithm, expiresIn } = getAccessTokenConfig();
  return jwt.sign(payload, secret, { algorithm, expiresIn });
};

export const signRefreshToken = (payload) => {
  const { secret, algorithm, expiresIn } = getRefreshTokenConfig();
  return jwt.sign(payload, secret, { algorithm, expiresIn });
};

export const verifyAccessToken = (token) => {
  const { secret, algorithm } = getAccessTokenConfig();
  return jwt.verify(token, secret, { algorithms: [algorithm] });
};

export const verifyRefreshToken = (token) => {
  const { secret, algorithm } = getRefreshTokenConfig();
  return jwt.verify(token, secret, { algorithms: [algorithm] });
};
