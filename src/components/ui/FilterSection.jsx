import React from "react";
export default function FilterSection({ title, children }) {
  return <div className="filter-section"><b>{title}</b>{children}</div>;
}

