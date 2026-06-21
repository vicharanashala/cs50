import React from "react";
import { ArrowDown, ArrowRight, ArrowUp, Eye, MessageCircle, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { post } from "../../api.js";
import { relativeTime } from "../../utils/time.js";
import { highlightText } from "../../utils/highlight.js";
import AuthorIdentity from "../../components/common/AuthorIdentity.jsx";

export default function FaqCard({ faq, onChange, search = "" }) {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  async function upvote(event) {
    event.preventDefault();
    if (!auth.user) return navigate("/login", { state: { from: "/faqs", message: "Please login to continue" } });
    try {
      const data = await post(`/faqs/${faq._id}/upvote`, {});
      onChange({ ...faq, ...data, isTrending: data.upvotes > 5 || faq.answerCount > 3 });
      toast(data.upvoted ? "Upvoted!" : "Upvote removed", "info");
    } catch (error) {
      toast(error.message, "error");
    }
  }
  async function downvote(event) {
    event.preventDefault();
    if (!auth.user) return navigate("/login", { state: { from: "/faqs", message: "Please login to continue" } });
    try {
      const data = await post(`/faqs/${faq._id}/downvote`, {});
      onChange({ ...faq, ...data, isTrending: data.upvotes > 5 || faq.answerCount > 3 });
      toast(data.downvoted ? "Downvoted!" : "Downvote removed", "info");
    } catch (error) {
      toast(error.message, "error");
    }
  }
  return (
    <article className="faq-card">
      <div className="faq-content">
        <div className="faq-topline">
          <span className="topic-badge violet">{faq.category}</span>
          {faq.company && <span className="mini-chip">{faq.company}</span>}
          {faq.role && <span className="mini-chip">{faq.role}</span>}
          {faq.isTrending && <span className="trending"><TrendingUp size={12} /> Trending</span>}
          <span className={`status ${faq.status}`}><i />{faq.status}</span>
        </div>
        <Link to={`/faqs/${faq._id}`}><h3 dangerouslySetInnerHTML={{ __html: highlightText(faq.title, search) }} /></Link>
        <p dangerouslySetInnerHTML={{ __html: highlightText(faq.description, search) }} />
        <Link className="faq-read-more" to={`/faqs/${faq._id}`}>View full FAQ <ArrowRight size={13} /></Link>
        <div className="tag-row">{faq.tags?.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <div className="faq-footer">
          <AuthorIdentity item={faq} meta={`asked ${relativeTime(faq.createdAt)}`} />
          <div className="faq-metrics">
            <button className={`metric-button vote ${faq.upvoted ? "active" : ""}`} onClick={upvote}><ArrowUp size={14} /> {faq.upvotes}</button>
            <button className={`metric-button vote ${faq.downvoted ? "active" : ""}`} onClick={downvote}><ArrowDown size={14} /> {faq.downvotes}</button>
            <Link to={`/faqs/${faq._id}#answer`}><MessageCircle size={14} /> {faq.answerCount}</Link>
            <span><Eye size={14} /> {faq.viewCount}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

