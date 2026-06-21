import React from "react";
import { useState } from "react";
import { Check, CircleAlert, Sparkles } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../hooks/useToast.jsx";
import { post } from "../api.js";
import Brand from "../components/layout/Brand.jsx";
import Field from "../components/ui/Field.jsx";
import PasswordField from "../components/ui/PasswordField.jsx";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const toast = useToast();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await post(`/auth/reset-password/${token}`, form);
      setDone(true);
    } catch (error) {
      setErrors(error.errors);
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }
  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <span className="admin-mark" style={{ background: "var(--green)" }}><Check size={22} /></span>
          <h1>Password reset!</h1>
          <p>Your password has been updated. You can now login with your new password.</p>
          <Link className="primary-button" to="/login" style={{ display: "inline-block", marginTop: "16px" }}>Go to login</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <span className="section-label"><Sparkles size={14} /> Set new password</span>
        <h1>Reset your password</h1>
        <p>Choose a new password for your CrowdFAQ account.</p>
        <form className="form-grid" onSubmit={submit}>
          <PasswordField label="New password" error={errors.password} required minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <PasswordField label="Confirm password" error={errors.confirmPassword} required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
          <button className="primary-button" disabled={busy}>{busy ? "Resetting..." : "Reset password"}</button>
        </form>
        <p className="auth-switch"><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}

