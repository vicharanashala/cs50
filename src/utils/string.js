import { categories } from "./constants.js";

export function initials(name = "Anonymous") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function authorName(item) {
  return item.isAnonymous ? "Anonymous" : item.author?.name ?? "Anonymous";
}

export function profilePath(item) {
  return !item.isAnonymous && item.author?._id ? `/profile/${item.author._id}` : null;
}

export function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  return params.toString();
}

export function categoriesFromParams(params) {
  return String(params.get("category") ?? "").split(",").filter((category) => categories.includes(category));
}
