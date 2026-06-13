import React from "react";
import { useEffect, useState } from "react";
import { Search, Shield, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../../hooks/useToast.jsx";
import { api, patch, post, remove } from "../../api.js";
import { authorName, profilePath } from "../../utils/string.js";
import Stat from "../../components/common/Stat.jsx";
import AdminTable from "../../components/common/AdminTable.jsx";
import Shell from "../../components/layout/Shell.jsx";
import PageLoader from "../../components/ui/PageLoader.jsx";

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [reports, setReports] = useState([]);
  const toast = useToast();
  async function load() {
    try {
      const [nextStats, nextUsers, nextFaqs, nextAnswers, nextReports] = await Promise.all([
        api("/admin/stats"), api("/admin/users"), api("/admin/faqs"), api("/admin/answers"), api("/admin/reports"),
      ]);
      setStats(nextStats); setUsers(nextUsers.users); setFaqs(nextFaqs.faqs); setAnswers(nextAnswers.answers); setReports(nextReports.reports);
    } catch (error) { toast(error.message, "error"); }
  }
  useEffect(() => { load(); }, []);
  async function ban(id) {
    try { await patch(`/admin/users/${id}/ban`); toast("User status updated", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function deleteUser(id) {
    if (!window.confirm("Delete this user and ALL their content? This cannot be undone.")) return;
    try { await remove(`/admin/users/${id}`); toast("User deleted", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function deleteFaq(id) {
    if (!window.confirm("Delete this FAQ and all of its answers?")) return;
    try { await remove(`/admin/faqs/${id}`); toast("FAQ deleted", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function resolve(id) {
    try { await patch(`/admin/reports/${id}`); toast("Report resolved", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function verifyAnswer(id) {
    try {
      const data = await patch(`/admin/answers/${id}/verify`);
      toast(data.summaryRefresh.updated
        ? data.answer.isVerified ? "Answer verified and AI summary updated" : "Answer marked unverified and AI summary refreshed"
        : data.answer.isVerified ? "Answer verified, but AI summary could not update" : "Answer marked unverified", "success");
      load();
    } catch (error) { toast(error.message, "error"); }
  }
  async function convertToComment(id) {
    if (!window.confirm("Convert this answer to a comment on the FAQ? The author loses 5 reputation.")) return;
    try { await post(`/admin/answers/${id}/convert-to-comment`); toast("Answer converted to comment", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function featureFaq(id) {
    try { await patch(`/admin/faqs/${id}/feature`); toast("Feature toggled", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function mergeFaq(sourceId) {
    const targetId = prompt("Enter the ID of the target FAQ to merge into:");
    if (!targetId) return;
    try { await api(`/faqs/${targetId}/merge/${sourceId}`, { method: "PUT" }); toast("FAQs merged", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function closeFaq(id) {
    try { await post(`/faqs/${id}/close`, { reason: "other" }); toast("FAQ closed", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function reopenFaq(id) {
    try { await post(`/faqs/${id}/reopen`); toast("FAQ reopened", "success"); load(); } catch (error) { toast(error.message, "error"); }
  }
  async function deleteReportedContent(report) {
    if (!window.confirm("Delete the reported content?")) return;
    try {
      await remove(report.contentType === "faq" ? `/admin/faqs/${report.content?._id}` : `/answers/${report.content?._id}`);
      toast("Reported content deleted", "success");
      load();
    } catch (error) { toast(error.message, "error"); }
  }
  if (!stats) return <Shell><PageLoader /></Shell>;
  const value = search.toLowerCase();
  const visibleUsers = users.filter((user) => !value || user.name.toLowerCase().includes(value) || user.email.toLowerCase().includes(value));
  const visibleFaqs = faqs.filter((faq) => !value || faq.title.toLowerCase().includes(value));
  return (
    <Shell>
      <main className="admin-page">
        <aside className="admin-sidebar">
          <span><Shield size={17} /> Admin dashboard</span>
          {[["overview", "Overview"], ["users", "Users"], ["faqs", "FAQs"], ["answers", "Answers"], ["reports", "Reports"]].map(([value, label]) => (
            <button className={tab === value ? "active" : ""} key={value} onClick={() => { setTab(value); setSearch(""); }}>{label}</button>
          ))}
        </aside>
        <section className="admin-main">
          <div className="page-title"><span className="section-label"><Shield size={14} /> Moderation</span><h1>{tab[0].toUpperCase() + tab.slice(1)}</h1></div>
          {(tab === "users" || tab === "faqs") && <div className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${tab}...`} /></div>}
          {tab === "overview" && <div className="stats-grid">{Object.entries({
            "Total users": stats.users, "Total FAQs": stats.faqs, "Total answers": stats.answers,
            "Open FAQs": stats.openFaqs, "Answered FAQs": stats.answeredFaqs, "Reports pending": stats.reportsPending,
          }).map(([label, value]) => <Stat key={label} label={label} value={value} />)}</div>}
          {tab === "users" && <AdminTable headings={["Name", "Email", "Branch", "Rep", "Questions", "Answers", "Action"]}>
            {visibleUsers.map((user) => <tr key={user._id}>
              <td><Link to={`/profile/${user._id}`}>{user.name}</Link></td>
              <td>{user.email}</td><td>{user.branch || "-"}</td><td>{user.reputation}</td>
              <td>{user.questionsAsked}</td><td>{user.answersGiven}</td>
              <td style={{ display: "flex", gap: "6px" }}>
                <button className="table-button" onClick={() => ban(user._id)}>{user.isBanned ? "Unban" : "Ban"}</button>
                <button className="table-button danger" onClick={() => deleteUser(user._id)}><Trash2 size={14} /></button>
              </td>
            </tr>)}
          </AdminTable>}
          {tab === "faqs" && <AdminTable headings={["ID", "Title", "Author", "Status", "Answers", "Action"]}>
            {visibleFaqs.map((faq) => <tr key={faq._id}>
              <td style={{ fontFamily: "monospace", fontSize: "10px", color: "var(--muted)" }}>{faq._id}</td>
              <td><Link to={`/faqs/${faq._id}`}>{faq.title}</Link></td>
              <td>{profilePath(faq) ? <Link to={profilePath(faq)}>{authorName(faq)}</Link> : authorName(faq)}</td>
              <td>{faq.status}</td><td>{faq.answerCount}</td>
              <td style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                <button className="table-button" onClick={() => featureFaq(faq._id)}>{faq.isFeatured ? "Unpin" : "Pin"}</button>
                {faq.status !== "closed" ? <button className="table-button" onClick={() => closeFaq(faq._id)}>Close</button> : <button className="table-button" onClick={() => reopenFaq(faq._id)}>Reopen</button>}
                <button className="table-button" title="Move all answers from another FAQ into this one" onClick={() => { const source = prompt("Enter the ID of the duplicate FAQ to merge FROM (copy from ID column):"); if (source) api(`/faqs/${faq._id}/merge/${source}`, { method: "PUT" }).then(() => { toast("FAQs merged", "success"); load(); }).catch((e) => toast(e.message, "error")); }}>Merge into</button>
                <button className="table-button danger" onClick={() => deleteFaq(faq._id)}><Trash2 size={14} /></button>
              </td>
            </tr>)}
          </AdminTable>}
          {tab === "answers" && <AdminTable headings={["Answer", "FAQ", "Author", "Status", "Action"]}>
            {answers.map((answer) => <tr key={answer._id}>
              <td>{answer.body.slice(0, 90)}</td>
              <td><Link to={`/faqs/${answer.faq?._id}`}>{answer.faq?.title}</Link></td>
              <td>{profilePath(answer) ? <Link to={profilePath(answer)}>{authorName(answer)}</Link> : authorName(answer)}</td>
              <td><span className={`verification-badge ${answer.isVerified ? "verified" : "unverified"}`}>{answer.isVerified ? "Verified" : "Unverified"}</span></td>
              <td style={{ display: "flex", gap: "4px" }}>
                <button className="table-button" onClick={() => verifyAnswer(answer._id)}>{answer.isVerified ? "Unverify" : "Verify"}</button>
                <button className="table-button" onClick={() => convertToComment(answer._id)}>→ Comment</button>
              </td>
            </tr>)}
          </AdminTable>}
          {tab === "reports" && <AdminTable headings={["Type", "Reporter", "Reason", "Content", "Date", "Action"]}>
            {reports.filter((report) => !report.resolved).map((report) => <tr key={report._id}>
              <td>{report.contentType}</td><td>{report.reporter?.name}</td><td>{report.reason}</td>
              <td>{report.content?.title ?? report.content?.body?.slice(0, 70) ?? "Content removed"}</td>
              <td>{new Date(report.createdAt).toLocaleDateString()}</td>
              <td className="table-actions">
                <button className="table-button" onClick={() => resolve(report._id)}>Dismiss</button>
                {report.content && <button className="table-button danger" onClick={() => deleteReportedContent(report)}>Delete content</button>}
              </td>
            </tr>)}
          </AdminTable>}
        </section>
      </main>
    </Shell>
  );
}

