import React from "react";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast.jsx";
import { useDebounced } from "../hooks/useDebounced.js";
import { api, post } from "../api.js";
import { categories, branches } from "../utils/constants.js";
import Shell from "../components/layout/Shell.jsx";
import Field from "../components/ui/Field.jsx";

export default function AskFaqPage() {
  const empty = { title: "", description: "", category: "", company: "", role: "", branch: "", semester: "", tags: [], tag: "", isAnonymous: false };
  const [form, setForm] = useState(empty);
  const [similar, setSimilar] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const debouncedTitle = useDebounced(form.title, 500);
  const debouncedTag = useDebounced(form.tag, 300);
  const navigate = useNavigate();
  const toast = useToast();
  const suggestionsRef = useRef();
  useEffect(() => {
    if (debouncedTitle.length < 5 || dismissed) return setSimilar([]);
    api(`/faqs/similar?${new URLSearchParams({ title: debouncedTitle }).toString()}`).then((data) => setSimilar(data.faqs)).catch(() => {});
  }, [debouncedTitle, dismissed]);

  useEffect(() => {
    if (debouncedTag.length < 1) return setSuggestions([]);
    api(`/tags?search=${encodeURIComponent(debouncedTag)}`).then((data) => setSuggestions(data.tags)).catch(() => setSuggestions([]));
  }, [debouncedTag]);

  useEffect(() => {
    function handleClick(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) setSuggestions([]);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  function update(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (name === "title") setDismissed(false);
  }
  function addTag(tag) {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !form.tags.includes(trimmed) && form.tags.length < 5) {
      setForm({ ...form, tags: [...form.tags, trimmed], tag: "" });
      setSuggestions([]);
    }
  }
  function handleTagKey(event) {
    if (["Enter", ","].includes(event.key)) {
      event.preventDefault();
      addTag(form.tag);
    }
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        isAnonymous: form.isAnonymous,
        tags: form.tags,
        ...(form.company && { company: form.company }),
        ...(form.role && { role: form.role }),
        ...(form.branch && { branch: form.branch }),
        ...(form.semester && { semester: form.semester }),
      };
      const data = await post("/faqs", payload);
      toast("Your question is live!");
      navigate(`/faqs/${data.faq._id}`);
    } catch (error) {
      setErrors(error.errors);
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <main className="narrow-page">
        <div className="page-title">
          <span className="section-label"><Plus size={14} /> Ask the community</span>
          <h1>Post a new question</h1>
          <p>Include enough detail for other students to give a useful answer.</p>
        </div>
        <form className="surface form-grid" onSubmit={submit}>
          <Field label={`Title (${form.title.length}/200)`} error={errors.title} required>
            <input autoFocus required minLength="10" maxLength="200" name="title" value={form.title} onChange={update} />
          </Field>
          {!!similar.length && <div className="similar-box">
            <b>Similar questions already exist - check them before posting</b>
            {similar.map((faq) => <a key={faq._id} href={`/faqs/${faq._id}`} target="_blank" rel="noreferrer">{faq.title}</a>)}
            <button type="button" onClick={() => { setDismissed(true); setSimilar([]); }}>Post anyway</button>
          </div>}
          <Field label={`Description (${form.description.length}/5000)`} error={errors.description} required>
            <textarea required minLength="20" maxLength="5000" name="description" value={form.description} onChange={update} />
          </Field>
          <div className="form-row">
            <Field label="Category" error={errors.category} required>
              <select required name="category" value={form.category} onChange={update}>
                <option value="">Select</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Company (optional)"><input name="company" value={form.company} onChange={update} placeholder="e.g. Google" /></Field>
          </div>
          <div className="form-row">
            <Field label="Role (optional)"><input name="role" value={form.role} onChange={update} placeholder="e.g. SDE Intern" /></Field>
            <Field label="Branch (optional)">
              <select name="branch" value={form.branch} onChange={update}>
                <option value="">Select</option>
                {branches.map((branch) => <option key={branch}>{branch}</option>)}
              </select>
            </Field>
            <Field label="Semester (optional)">
              <select name="semester" value={form.semester} onChange={update}>
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester}>{semester}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tags (optional - press Enter or comma, up to 5)" error={errors.tags}>
            <div className="tag-input-wrap" ref={suggestionsRef}>
              <input name="tag" value={form.tag} onChange={update} onKeyDown={handleTagKey} placeholder="e.g. interview" autoComplete="off" />
              {!!suggestions.length && <div className="tag-suggestions">{suggestions.map((tag) => <button type="button" key={tag.name} onClick={() => addTag(tag.name)} onMouseDown={(event) => event.preventDefault()}>{tag.name} <small>{tag.usageCount}</small></button>)}</div>}
            </div>
          </Field>
          <div className="tag-row">
            {form.tags.map((tag) => <button type="button" key={tag} onClick={() => setForm({ ...form, tags: form.tags.filter((item) => item !== tag) })}>#{tag} <X size={11} /></button>)}
          </div>
          <label className="check-label"><input type="checkbox" name="isAnonymous" checked={form.isAnonymous} onChange={update} /> Post anonymously</label>
          <button className="primary-button" disabled={busy}>{busy ? "Posting..." : "Post question"}</button>
        </form>
      </main>
    </Shell>
  );
}

