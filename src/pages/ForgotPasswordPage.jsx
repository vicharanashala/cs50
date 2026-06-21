import React from "react";
import { useState } from "react";
import { Check, CircleAlert, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../hooks/useToast.jsx";
import { post } from "../api.js";
import Brand from "../components/layout/Brand.jsx";
import Field from "../components/ui/Field.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await post("/auth/forgot-password", { email });
      setSent(true);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }
  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <span className="admin-mark" style={{ background: "var(--green)" }}><Check size={22} /></span>
          <h1>Check your email</h1>
          <p>If an account exists for <b>{email}</b>, we sent a password reset link. It expires in 1 hour.</p>
          <p className="auth-switch"><Link to="/login">Back to login</Link></p>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <span className="section-label"><Sparkles size={14} /> Password reset</span>
        <h1>Forgot password?</h1>
        <p>Enter your email and we'll send you a link to reset your password.</p>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Email address" required>
            <input autoFocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <button className="primary-button" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
        </form>
        <p className="auth-switch"><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}

