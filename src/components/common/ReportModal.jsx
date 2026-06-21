import React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "../../hooks/useToast.jsx";
import { post } from "../../api.js";
import { reportReasons } from "../../utils/constants.js";

export default function ReportModal({ report, onClose }) {
  const [reason, setReason] = useState("spam");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await post(`/${report.type === "faq" ? "faqs" : "answers"}/${report.id}/report`, { reason });
      toast("Report submitted", "success");
      onClose();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="composer" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <button type="button" className="close-button" onClick={onClose}><X size={18} /></button>
        <h2>Report content</h2>
        <p>Choose the reason that best describes the issue.</p>
        {reportReasons.map((item) => (
          <label className="check-label" key={item}>
            <input type="radio" name="reason" checked={reason === item} onChange={() => setReason(item)} />
            {item[0].toUpperCase() + item.slice(1)}
          </label>
        ))}
        <button className="primary-button" disabled={busy}>{busy ? "Submitting..." : "Submit report"}</button>
      </form>
    </div>
  );
}

