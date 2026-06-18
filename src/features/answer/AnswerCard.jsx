import React from "react";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, CircleAlert, Heart, Pencil, Reply, Send, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { patch, post, remove } from "../../api.js";
import { authorName } from "../../utils/string.js";
import { relativeTime } from "../../utils/time.js";
import AuthorIdentity from "../../components/common/AuthorIdentity.jsx";

export default function AnswerCard({ answer, ownsFaq, onReload, onReport }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(answer.body);
  const hasLongAnswer = answer.body.length > 320;
  const ownsAnswer = auth.user?._id === answer.author?._id;
  const upvoted = answer.upvotedBy.includes(auth.user?._id);
  const downvoted = answer.downvotedBy.includes(auth.user?._id);
  async function vote(type) {
    if (!auth.user) return navigate("/login", { state: { message: "Please login to continue" } });
    try {
      await post(`/answers/${answer._id}/${type}`, {});
      toast(type === "upvote" ? "Vote updated" : "Feedback updated", "info");
      onReload();
    } catch (error) {
      toast(error.message, "error");
    }
  }
  async function accept() {
    try {
      const data = await patch(`/answers/${answer._id}/accept`);
      toast(data.accepted ? "Best Answer marked!" : "Best Answer unmarked", "success");
      onReload();
    } catch (error) {
      toast(error.message, "error");
    }
  }
  async function postComment(event, replyToId = null) {
    event.preventDefault();
    if (!auth.user) return navigate("/login", { state: { message: "Please login to continue" } });
    if (ownsFaq) return toast("You cannot comment on your own FAQ", "warning");
    setCommentBusy(true);
    try {
      await post(`/answers/${answer._id}/comments`, { body: comment, replyTo: replyToId });
      setComment("");
      setReplyingTo(null);
      toast("Comment posted", "success");
      onReload();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setCommentBusy(false);
    }
  }
  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await remove(`/answers/${answer._id}/comments/${commentId}`);
      toast("Comment deleted", "info");
      onReload();
    } catch (error) {
      toast(error.message, "error");
    }
  }
  async function likeComment(commentId) {
    if (!auth.user) return navigate("/login", { state: { message: "Please login to continue" } });
    try {
      await post(`/answers/${answer._id}/comments/${commentId}/upvote`, {});
      onReload();
    } catch (error) {
      toast(error.message, "error");
    }
  }
  async function deleteAnswer() {
    if (answer.isVerified) return toast("Verified answers require admin permission to delete", "warning");
    if (!window.confirm("Delete your answer?")) return;
    try {
      await remove(`/answers/${answer._id}`);
      toast("Answer deleted", "info");
      onReload();
    } catch (error) {
      toast(error.message, "error");
    }
  }
  async function verifyAnswer() {
    try {
      const data = await patch(`/admin/answers/${answer._id}/verify`);
      toast(
        data.summaryRefresh?.updated 
          ? (data.answer.isVerified ? "Answer verified and AI summary updated" : "Answer marked unverified and AI summary refreshed")
          : (data.answer.isVerified ? "Answer verified, but AI summary could not update" : "Answer marked unverified"),
        "success"
      );
      onReload();
    } catch (error) {
      toast(error.message, "error");
    }
  }
  async function saveEdit(event) {
    event.preventDefault();
    if (editBody.length < 20) return toast("Answer must be at least 20 characters", "warning");
    try {
      await patch(`/answers/${answer._id}`, { body: editBody });
      toast("Answer updated", "success");
      setIsEditing(false);
      onReload();
    } catch (error) {
      toast(error.message, "error");
    }
  }
  if (isEditing) {
    return (
      <form className="surface answer-card" onSubmit={saveEdit} style={{ padding: "16px" }}>
        <h3>Edit your answer</h3>
        <textarea required minLength="20" maxLength="5000" value={editBody} onChange={(event) => setEditBody(event.target.value)} style={{ width: "100%", margin: "10px 0", padding: "10px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--panel-bg)", color: "var(--text)", font: "inherit", resize: "vertical", minHeight: "100px" }} />
        <div className="answer-form-footer">
          <button type="submit" className="primary-button">Save</button>
          <button type="button" className="outline-button" onClick={() => setIsEditing(false)} style={{ marginLeft: "8px" }}>Cancel</button>
        </div>
      </form>
    );
  }
  return (
    <article className={`surface answer-card ${answer.isAccepted ? "accepted" : ""}`}>
      {answer.isAccepted && <div className="best-answer"><CheckCircle2 size={15} /> Best Answer</div>}
      <div className="answer-card-header">
        <AuthorIdentity item={answer} color="green" meta={`${answer.author?.reputation ?? 0} reputation - answered ${relativeTime(answer.createdAt)}`} />
        <span className={`verification-badge ${answer.isVerified ? "verified" : "unverified"}`}>
          {answer.isVerified ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
          {answer.isVerified ? "Verified" : "Unverified"}
        </span>
      </div>
      <p className={`answer-body ${hasLongAnswer && !expanded ? "collapsed" : ""}`}>{answer.body}</p>
      {hasLongAnswer && <button className="answer-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Show more"} <ChevronDown size={14} /></button>}
      <div className="answer-actions">
        <button className={upvoted ? "active" : ""} onClick={() => vote("upvote")}><ArrowUp size={15} /> {answer.upvotes}</button>
        <button className={downvoted ? "active" : ""} onClick={() => vote("downvote")}><ArrowDown size={15} /> {answer.downvotes}</button>
        {(ownsFaq || auth.user?.role === "admin") && <button disabled={!answer.isVerified} title={answer.isAccepted ? "Remove Best Answer" : answer.isVerified ? "Mark as Best Answer" : "Admin verification required"} onClick={accept}>{answer.isAccepted ? <X size={15} /> : <Check size={15} />}{answer.isAccepted ? "Unaccept" : "Accept"}</button>}
        <button title="Report" onClick={onReport}><CircleAlert size={15} /></button>
        {ownsAnswer && !answer.isVerified && <button title="Edit" onClick={() => { setEditBody(answer.body); setIsEditing(true); }}><Pencil size={15} /></button>}
        {ownsAnswer && <button className="danger" title={answer.isVerified ? "Verified answers require admin permission to delete" : "Delete your answer"} onClick={deleteAnswer}><Trash2 size={15} /></button>}
        {auth.user?.role === "admin" && (
          <button style={{ marginLeft: "auto" }} title={answer.isVerified ? "Unverify Answer" : "Verify Answer"} onClick={verifyAnswer}>
            {answer.isVerified ? <X size={15} /> : <CheckCircle2 size={15} />}
            {answer.isVerified ? "Unverify" : "Verify"}
          </button>
        )}
      </div>
      <div className="comment-thread">
        {(() => {
          const commentsTree = [];
          const commentMap = {};
          (answer.comments || []).forEach(c => commentMap[c._id] = { ...c, children: [] });
          (answer.comments || []).forEach(c => {
            if (c.replyTo && commentMap[c.replyTo]) {
              commentMap[c.replyTo].children.push(commentMap[c._id]);
            } else {
              commentsTree.push(commentMap[c._id]);
            }
          });

          const CommentNode = ({ item }) => (
            <div className="comment-node">
              <div className="comment" id={`comment-${item._id}`}>
                <div className="comment-top">
                  <b>{authorName(item)}</b> <small>{relativeTime(item.createdAt)}</small>
                  <div className="comment-actions">
                    <button title="Reply" onClick={() => { setReplyingTo(replyingTo === item._id ? null : item._id); setComment(""); }}><Reply size={12} /> Reply</button>
                    <button className={item.upvotedBy?.includes(auth.user?._id) ? "active" : ""} onClick={() => likeComment(item._id)}><Heart size={12} fill={item.upvotedBy?.includes(auth.user?._id) ? "currentColor" : "none"} /> {item.upvotes ?? 0}</button>
                    {auth.user?._id === item.author?._id && <button onClick={() => deleteComment(item._id)}><Trash2 size={12} /></button>}
                  </div>
                </div>
                <p className="comment-body">{item.body}</p>
              </div>
              {replyingTo === item._id && (
                <form className="comment-form reply-form" onSubmit={(e) => postComment(e, item._id)}>
                  <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a reply..." maxLength="500" required autoFocus />
                  <button disabled={commentBusy || !comment.trim()} aria-label="Post reply"><Send size={14} /></button>
                </form>
              )}
              {item.children.length > 0 && (
                <div className="comment-replies">
                  {item.children.map(child => <CommentNode key={child._id} item={child} />)}
                </div>
              )}
            </div>
          );

          return commentsTree.map(item => <CommentNode key={item._id} item={item} />);
        })()}
      </div>
      <form className="comment-form" onSubmit={(e) => postComment(e, null)}>
        <input value={replyingTo ? "" : comment} onChange={(event) => { if (replyingTo) setReplyingTo(null); setComment(event.target.value); }} placeholder="Add a comment..." maxLength="500" required />
        <button disabled={commentBusy || !comment.trim()} aria-label="Post comment"><Send size={14} /></button>
      </form>
    </article>
  );
}

