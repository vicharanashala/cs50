import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { jwtSecret } from "../config/env.js";
import { fail } from "../utils/response.js";

function parseToken(request) {
  const authorization = request.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function authenticate(request, response, next) {
  try {
    const token = parseToken(request);
    if (!token) return fail(response, 401, "Please login to continue");
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.id);
    if (!user) return fail(response, 401, "Your session is no longer valid");
    if (user.isBanned) return fail(response, 403, "Your account has been banned");
    request.user = user;
    return next();
  } catch {
    return fail(response, 401, "Your session has expired. Please login again");
  }
}

export async function optionalAuth(request, _response, next) {
  try {
    const token = parseToken(request);
    if (token) {
      const payload = jwt.verify(token, jwtSecret);
      request.user = await User.findById(payload.id);
    }
  } catch {
    request.user = null;
  }
  next();
}

export function adminOnly(request, response, next) {
  return request.user.role === "admin" ? next() : fail(response, 403, "Administrator access required");
}

export function moderatorOrAdmin(request, response, next) {
  return ["moderator", "admin"].includes(request.user.role) ? next() : fail(response, 403, "Moderator or administrator access required");
}
