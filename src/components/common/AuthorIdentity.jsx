import React from "react";
import { Link } from "react-router-dom";
import { initials, authorName, profilePath } from "../../utils/string.js";

export default function AuthorIdentity({ item, meta, color = "blue" }) {
  const name = authorName(item);
  const content = (
    <>
      <span className={`avatar avatar-${color}`}>{initials(name)}</span>
      <span><b>{name}</b><small>{meta}</small></span>
    </>
  );
  const path = profilePath(item);
  return path ? <Link className="author profile-link" to={path}>{content}</Link> : <div className="author">{content}</div>;
}

