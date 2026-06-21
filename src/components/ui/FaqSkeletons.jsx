import React from "react";
export default function FaqSkeletons() {
  return (
    <div className="skeleton-list">
      {[1, 2, 3].map((item) => (
        <div className="skeleton-card" key={item}>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
          <span className="skeleton-line" />
          <span className="skeleton-line medium" />
          <span className="skeleton-line footer" />
        </div>
      ))}
    </div>
  );
}

