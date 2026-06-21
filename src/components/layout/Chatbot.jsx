import React from "react";
import { useEffect, useRef, useState } from "react";
import { Bot, Plus, Send, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { post } from "../../api.js";

export default function Chatbot() {
  const auth = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState(() => [{
    role: "bot",
    text: "Hi! Ask me about internships. I answer using verified CrowdFAQ community answers.",
  }]);
  const messagesEnd = useRef();
  useEffect(() => {
    if (open) messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);
  async function submit(event) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const data = await post("/chatbot", { message });
      setMessages((current) => [...current, { role: "bot", text: data.answer, sources: data.sources, suggestFaq: data.suggestFaq }]);
    } catch (error) {
      toast(error.message, "error");
      setMessages((current) => [...current, { role: "bot", text: "I could not answer that right now. Please try again shortly." }]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!open && location.pathname === "/faqs" && <button className="chat-greeting" onClick={() => setOpen(true)}>Hii{auth.user ? `, ${auth.user.name.split(" ")[0]}` : ""}! Need any help?</button>}
      {open && <section className="chat-panel" aria-label="CrowdFAQ AI assistant">
        <header className="chat-header">
          <span className="chat-bot-icon"><Bot size={18} /></span>
          <span><b>CrowdFAQ Assistant</b><small>Grounded in verified answers</small></span>
          <button aria-label="Close chat" onClick={() => setOpen(false)}><X size={17} /></button>
        </header>
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
              <p>{message.text}</p>
              {!!message.sources?.length && <div className="chat-sources"><small>Community sources</small>{message.sources.map((source) => <Link key={source.id} to={`/faqs/${source.id}`} onClick={() => setOpen(false)}>{source.title}</Link>)}</div>}
              {message.suggestFaq && <Link className="chat-ask-link" to="/faqs/ask" onClick={() => setOpen(false)}><Plus size={14} /> Ask a new FAQ</Link>}
            </div>
          ))}
          {busy && <div className="chat-message bot"><p>Checking verified community answers...</p></div>}
          <span ref={messagesEnd} />
        </div>
        <form className="chat-form" onSubmit={submit}>
          <input maxLength="500" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about internships..." />
          <button disabled={busy || !input.trim()} aria-label="Send question"><Send size={16} /></button>
        </form>
      </section>}
      <button className="chat-toggle" aria-label={open ? "Close AI assistant" : "Open AI assistant"} onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>
    </>
  );
}

