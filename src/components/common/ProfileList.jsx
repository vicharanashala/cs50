import React from "react";
export default function ProfileList({ title, empty, children }) {
  return (
    <section className="surface profile-list">
      <h2>{title}</h2>
      {children.length ? children : <p>{empty}</p>}
    </section>
  );
}

