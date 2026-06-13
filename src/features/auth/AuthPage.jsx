import React from "react";
import { useEffect, useState } from "react";
import { CircleAlert, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { post } from "../../api.js";
import { branches } from "../../utils/constants.js";
import Brand from "../../components/layout/Brand.jsx";
import Field from "../../components/ui/Field.jsx";
import PasswordField from "../../components/ui/PasswordField.jsx";

export default function AuthPage({ register = false }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", branch: "", semester: "", rollNumber: "", rememberMe: false });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.state?.message) toast(location.state.message, "info");
  }, [location.state?.message]);
  function update(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setAlert("");
    try {
      const data = await post(register ? "/auth/register" : "/auth/login", form);
      auth.login(data.token, data.user);
      toast(register ? "Welcome to CrowdFAQ!" : `Welcome back, ${data.user.name}!`, "info");
      navigate(location.state?.from ?? "/faqs", { replace: true });
    } catch (error) {
      setErrors(error.errors);
      setAlert(error.message);
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <span className="section-label"><Sparkles size={14} /> Student community</span>
        <h1>{register ? "Create your account" : "Welcome back"}</h1>
        <p>{register ? "Join students sharing practical internship knowledge." : "Login to ask, answer, and save useful FAQs."}</p>
        {alert && <div className="alert-box"><CircleAlert size={17} /><span>{alert}</span></div>}
        <form className="form-grid" onSubmit={submit}>
          {register && <Field label="Full name" error={errors.name} required><input autoFocus required name="name" value={form.name} onChange={update} /></Field>}
          <Field label="Email address" error={errors.email} required><input autoFocus={!register} required type="email" name="email" value={form.email} onChange={update} /></Field>
          <PasswordField label="Password" error={errors.password} required minLength="8" name="password" value={form.password} onChange={update} />
          {register && <>
            <PasswordField label="Confirm password" error={errors.confirmPassword} required name="confirmPassword" value={form.confirmPassword} onChange={update} />
            <div className="form-row">
              <Field label="Branch (optional)" error={errors.branch}><select name="branch" value={form.branch} onChange={update}><option value="">Select</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></Field>
              <Field label="Semester (optional)" error={errors.semester}><select name="semester" value={form.semester} onChange={update}><option value="">Select</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester}>{semester}</option>)}</select></Field>
            </div>
            <Field label="Roll number (optional)"><input name="rollNumber" value={form.rollNumber} onChange={update} /></Field>
          </>}
          {!register && <><label className="check-label"><input type="checkbox" name="rememberMe" checked={form.rememberMe} onChange={update} /> Remember me for 30 days</label><Link className="muted-link" to="/forgot-password" style={{ fontSize: "14px", textAlign: "right", display: "block" }}>Forgot password?</Link></>}
          <button className="primary-button" disabled={busy}>{busy ? "Please wait..." : register ? "Create account" : "Login"}</button>
        </form>
        <p className="auth-switch">{register ? "Already have an account?" : "New to CrowdFAQ?"} <Link to={register ? "/login" : "/register"}>{register ? "Login" : "Register"}</Link></p>
      </div>
    </div>
  );
}

