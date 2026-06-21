import React from "react";
import { useState } from "react";
import { Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { post } from "../../api.js";
import Field from "../../components/ui/Field.jsx";
import PasswordField from "../../components/ui/PasswordField.jsx";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await post("/auth/admin/login", form);
      auth.login(data.token, data.user);
      toast("Admin access granted", "success");
      navigate("/admin");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page admin-login-page">
      <div className="auth-card admin-login-card">
        <span className="admin-mark"><Shield size={22} /></span>
        <h1>Admin portal</h1>
        <p>Restricted CrowdFAQ moderation access.</p>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Admin email" required><input autoFocus required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <PasswordField label="Password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <button className="primary-button" disabled={busy}>{busy ? "Checking..." : "Enter dashboard"}</button>
        </form>
        <Link className="muted-link" to="/faqs">Back to public FAQs</Link>
      </div>
    </div>
  );
}

