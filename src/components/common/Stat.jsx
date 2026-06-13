import React from "react";
export default function Stat({ label, value, onClick, active = false }) {
  const content = <><b>{value}</b><span>{label}</span></>;
  return onClick ? (
    <button className={`surface stat-card clickable ${active ? "active" : ""}`} onClick={onClick}>{content}</button>
  ) : (
    <div className="surface stat-card">{content}</div>
  );
}

