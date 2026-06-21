import React from "react";
export default function AdminTable({ headings, children }) {
  return (
    <div className="surface table-wrap">
      <table>
        <thead>
          <tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

