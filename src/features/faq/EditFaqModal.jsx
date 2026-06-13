import React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "../../hooks/useToast.jsx";
import { patch } from "../../api.js";
import { categories, branches } from "../../utils/constants.js";

export default function EditFaqModal({ faq, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: faq.title, description: faq.description, category: faq.category,
    company: faq.company || "", role: faq.role || "", branch: faq.branch || "",
    semester: faq.semester || "", tags: faq.tags || [], tag: "",
    isAnonymous: faq.isAnonymous || false,
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();
  function update(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  function addTag(event) {
    if (!["Enter", ","].includes(event.key)) return;
    event.preventDefault();
    const tag = form.tag.trim().toLowerCase();
    if (tag && !form.tags.includes(tag) && form.tags.length < 5) setForm({ ...form, tags: [...form.tags, tag], tag: "" });
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const data = await patch(`/faqs/${faq._id}`, { ...form, semester: form.semester || undefined });
      toast("FAQ updated", "success");
      onSaved(data.faq);
    } catch (error) {
      setErrors(error.errors);
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="composer" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <button type="button" className="close-button" onClick={onClose}><X size={18} /></button>
        <h2>Edit your question</h2>
        <div className="form-grid">
          <div className="field">
            <label>Title<span className="required-star">*</span></label>
            <input required minLength="10" maxLength="200" name="title" value={form.title} onChange={update} />
          </div>
          <div className="field">
            <label>Description<span className="required-star">*</span></label>
            <textarea required minLength="20" maxLength="5000" name="description" value={form.description} onChange={update} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Category<span className="required-star">*</span></label>
              <select required name="category" value={form.category} onChange={update}>
                <option value="">Select</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Company (optional)</label>
              <input name="company" value={form.company} onChange={update} placeholder="e.g. Google" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Role (optional)</label>
              <input name="role" value={form.role} onChange={update} placeholder="e.g. SDE Intern" />
            </div>
            <div className="field">
              <label>Branch (optional)</label>
              <select name="branch" value={form.branch} onChange={update}>
                <option value="">Select</option>
                {branches.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Semester (optional)</label>
              <select name="semester" value={form.semester} onChange={update}>
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Tags (optional - press Enter to add)</label>
            <input value={form.tag} onChange={update} name="tag" onKeyDown={addTag} placeholder="Type and press Enter" />
          </div>
          {form.tags.length > 0 && <div className="tag-row">{form.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          <label className="check-label"><input type="checkbox" name="isAnonymous" checked={form.isAnonymous} onChange={update} /> Post anonymously</label>
          <button className="primary-button" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
          {errors && Object.entries(errors).map(([field, message]) => <div className="field-error" key={field}>{field}: {message}</div>)}
        </div>
      </form>
    </div>
  );
}

