import React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ label, error, name, value, onChange, required, valid, ...props }) {
  const [visible, setVisible] = useState(false);
  const cls = `field${error ? " invalid" : ""}${valid ? " valid" : ""}`;
  return (
    <label className={cls}>
      <span>{label}{required && <span className="required-star">*</span>}</span>
      <div className="password-wrap">
        <input {...props} required={required} type={visible ? "text" : "password"} name={name} value={value} onChange={onChange} />
        <button type="button" className="password-toggle" tabIndex={-1} aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

