import React from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Bot, CheckCircle2, CircleAlert, Eye, Link2, Lock, MessageCircle, Pencil, Plus, Sparkles, Trash2, Unlock, UserCheck, UserPlus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useToast } from "../hooks/useToast.jsx";
import { api, patch, post, remove } from "../api.js";
import { relativeTime } from "../utils/time.js";
import AuthorIdentity from "../components/common/AuthorIdentity.jsx";
import ReportModal from "../components/common/ReportModal.jsx";
import EditFaqModal from "../features/faq/EditFaqModal.jsx";
import AnswerCard from "../features/answer/AnswerCard.jsx";
import Shell from "../components/layout/Shell.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

export default function FaqDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [faq, setFaq] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [sort, setSort] = useState("upvoted");
  const [answerBody, setAnswerBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const viewed = useRef(false);
  async function loadFaq() {
    const data = await api(`/faqs/${id}`);
    setFaq({ ...data.faq, saved: data.saved, upvoted: data.upvoted, downvoted: data.downvoted, followed: data.followed });
  }
  async function loadAnswers() {
    setAnswers((await api(`/faqs/${id}/answers?sort=${sort}`)).answers);
  }
  useEffect(() => { loadFaq().catch((error) => toast(error.message, "error")); }, [id]);
  useEffect(() => { loadAnswers().catch((error) => toast(error.message, "error")); }, [id, sort]);
  useEffect(() => {
    if (viewed.current) return;
    const viewedKey = `viewed_faq_${id}`;
    if (localStorage.getItem(viewedKey)) return;
    viewed.current = true;
    patch(`/faqs/${id}/view`).then(({ viewCount }) => {
      localStorage.setItem(viewedKey, "1");
      setFaq((current) => current ? { ...current, viewCount } : current);
    }).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (faq && window.location.hash) {
      setTimeout(() => {
        document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [faq]);
  function requireLogin() {
    if (!auth.user) {
      navigate("/login", { state: { from: `/faqs/${id}`, message: "Please login to continue" } });
      return false;
    }
    return true;
  }
  async function toggleFaqAction(action) {
    if (!requireLogin()) return;
    try {
      const data = await post(`/faqs/${id}/${action}`, {});
      setFaq((current) => ({ ...current, ...data }));
      const messages = {
        upvote: data.upvoted ? "Upvoted!" : "Upvote removed",
        downvote: data.downvoted ? "Downvoted!" : "Downvote removed",
        save: data.saved ? "Saved to your bookmarks" : "Removed from bookmarks",
      };
      toast(messages[action], "info");
    } catch (error) { toast(error.message, "error"); }
  }
  async function toggleFollow() {
    if (!requireLogin()) return;
    try {
      const data = await post(`/faqs/${id}/follow`, {});
      setFaq((current) => ({ ...current, followed: data.followed }));
      toast(data.followed ? "Following this FAQ" : "FAQ follow removed", "info");
    } catch (error) { toast(error.message, "error"); }
  }
  async function submitAnswer(event) {
    event.preventDefault();
    if (ownsFaq) return toast("You cannot answer your own FAQ", "warning");
    setBusy(true);
    try {
      await post(`/faqs/${id}/answers`, { body: answerBody, isAnonymous: anonymous });
      setAnswerBody("");
      setAnonymous(false);
      toast("Answer posted successfully");
      await Promise.all([loadFaq(), loadAnswers()]);
    } catch (error) { toast(error.message, "error"); } finally { setBusy(false); }
  }
  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    toast("Link copied to clipboard!", "info");
  }
  async function deleteFaq() {
    if (faq.answerCount > 0) return toast("Answered FAQs require admin permission to delete", "warning");
    if (!window.confirm("Delete this unanswered FAQ?")) return;
    try {
      await remove(`/faqs/${id}`);
      toast("FAQ deleted", "success");
      navigate("/faqs");
    } catch (error) { toast(error.message, "error"); }
  }
  if (!faq) return <Shell><PageLoader /></Shell>;
  const ownsFaq = auth.user?._id === faq.author?._id;
  const isMod = ["moderator", "admin"].includes(auth.user?.role);
  async function closeFaq() {
    try {
      const data = await post(`/faqs/${id}/close`, {});
      setFaq((current) => ({ ...current, ...data.faq }));
      toast("FAQ closed", "success");
    } catch (error) { toast(error.message, "error"); }
  }
  async function reopenFaq() {
    try {
      const data = await post(`/faqs/${id}/reopen`, {});
      setFaq((current) => ({ ...current, ...data.faq }));
      toast("FAQ reopened", "success");
    } catch (error) { toast(error.message, "error"); }
  }
  return (
    <Shell>
      <main className="detail-page">
        <section className="surface detail-header">
          <div className="faq-topline">
            <span className="topic-badge violet">{faq.category}</span>
            {faq.company && <span className="mini-chip">{faq.company}</span>}
            {faq.role && <span className="mini-chip">{faq.role}</span>}
            <span className={`status ${faq.status}`}><i />{faq.status}</span>
          </div>
          <h1>{faq.title}</h1>
          <p className="detail-copy">{faq.description}</p>
          <div className="tag-row">{faq.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
          <div className="detail-meta">
            <AuthorIdentity item={faq} meta={`${faq.author?.reputation ?? 0} reputation - asked ${relativeTime(faq.createdAt)}`} />
            <span><Eye size={15} /> {faq.viewCount} views</span>
          </div>
          <div className="detail-actions">
            <button title="Upvote" className={faq.upvoted ? "active" : ""} onClick={() => toggleFaqAction("upvote")}><ArrowUp size={16} /> {faq.upvotes}</button>
            <button title="Downvote" className={faq.downvoted ? "active" : ""} onClick={() => toggleFaqAction("downvote")}><ArrowDown size={16} /> {faq.downvotes}</button>
            {auth.user?.role !== "admin" && (
              <>
                <button title="Save" className={faq.saved ? "active" : ""} onClick={() => toggleFaqAction("save")}><Bookmark size={16} /></button>
                {!ownsFaq && <button title="Follow" className={faq.followed ? "active" : ""} onClick={toggleFollow}>{faq.followed ? <UserCheck size={16} /> : <UserPlus size={16} />}</button>}
              </>
            )}
            <button title="Share" onClick={share}><Link2 size={16} /></button>
            <button title="Report" onClick={() => requireLogin() && setReport({ type: "faq", id })}><CircleAlert size={16} /></button>
            {isMod && (faq.status !== "closed"
              ? <button title="Close FAQ" onClick={closeFaq}><Unlock size={15} /></button>
              : <button title="Reopen FAQ" className="danger" onClick={reopenFaq}><Lock size={15} /></button>)}
            {ownsFaq && <><button title="Edit" onClick={() => setIsEditing(true)}><Pencil size={15} /></button><button title="Delete" className="danger" onClick={deleteFaq}><Trash2 size={16} /></button></>}
          </div>
        </section>
        <section className="surface summary-box">
          <span className="section-label"><Bot size={15} /> AI summary</span>
          {faq.aiSummary ? <><p>{faq.aiSummary}</p><small>Generated from verified community answers - updated {relativeTime(faq.aiSummaryUpdatedAt)}</small></> : <p>An AI summary will appear after an admin verifies a community answer.</p>}
          <small>Updates automatically when verified answers change.</small>
        </section>
        <section className="answers-section">
          <div className="answers-heading"><h2>{faq.answerCount} Answers</h2>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="upvoted">Most upvoted</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
          {answers.map((answer) => <AnswerCard key={answer._id} answer={answer} ownsFaq={ownsFaq} onReload={() => Promise.all([loadFaq(), loadAnswers()])} onReport={() => setReport({ type: "answer", id: answer._id })} />)}
          {!answers.length && <div className="surface empty-state"><MessageCircle size={28} /><h3>No answers yet</h3><p>Be the first to help this student.</p></div>}
        </section>
        <section className="surface answer-form" id="answer">
          <h2>Write Your Answer</h2>
          {ownsFaq
            ? <p className="answer-restriction">You cannot answer your own FAQ.</p>
            : auth.user
              ? <form onSubmit={submitAnswer}>
                  <textarea required minLength="20" maxLength="5000" value={answerBody} onChange={(event) => setAnswerBody(event.target.value)} placeholder="Share a clear, practical answer..." />
                  <div className="answer-form-footer">
                    <label className="check-label"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /> Answer anonymously</label>
                    <small>{answerBody.length}/5000</small>
                    <button className="primary-button" disabled={busy}>{busy ? "Posting..." : "Post answer"}</button>
                  </div>
                </form>
              : <div className="login-prompt">You must be logged in to post an answer. <Link className="outline-button" to="/login" state={{ from: `/faqs/${id}` }}>Login</Link></div>}
        </section>
        {report && <ReportModal report={report} onClose={() => setReport(null)} />}
        {isEditing && <EditFaqModal faq={faq} onClose={() => setIsEditing(false)} onSaved={(updated) => { setFaq((current) => ({ ...current, ...updated })); setIsEditing(false); }} />}
      </main>
    </Shell>
  );
}

