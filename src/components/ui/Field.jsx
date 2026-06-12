import React from "react";
export default function Field({ label, error, children, required, valid }) {
  const cls = `field${error ? " invalid" : ""}${valid ? " valid" : ""}`;
  return (
    <label className={cls}>
      <span>{label}{required && <span className="required-star">*</span>}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

