import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUp, Bell, Bookmark, Bot, Building2, Check, CheckCircle2,
  ChevronDown, CircleAlert, Eye, FileText, Filter, GraduationCap, House, Link2,
  LogIn, LogOut, Menu, MessageCircle, Moon, Pencil, Plus, Search, Send, Shield, Sparkles,
  Sun, Tag, Trash2, TrendingUp, Trophy, User, UserCheck, UserPlus, Users, X,
} from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { api, patch, post, remove } from "./api";

const categories = [
  "Interview Prep", "Coding Rounds", "Resume & Portfolio", "Application Process", "Stipend & Pay",
  "Work Culture", "Offer & PPO", "Remote Internships", "Higher Studies", "Other",
];
const branches = ["CSE", "ECE", "ME", "CE", "EE", "IT", "Other"];
const reportReasons = ["spam", "duplicate", "inappropriate", "other"];
const ToastContext = createContext(() => {});

function initials(name = "Anonymous") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
function relativeTime(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(value).toLocaleDateString();
}
function authorName(item) {
  return item.isAnonymous ? "Anonymous" : item.author?.name ?? "Anonymous";
}
function profilePath(item) {
  return !item.isAnonymous && item.author?._id ? `/profile/${item.author._id}` : null;
}
function AuthorIdentity({ item, meta, color = "blue" }) {
  const name = authorName(item);
  const content = <><span className={`avatar avatar-${color}`}>{initials(name)}</span><span><b>{name}</b><small>{meta}</small></span></>;
  const path = profilePath(item);
  return path ? <Link className="author profile-link" to={path}>{content}</Link> : <div className="author">{content}</div>;
}
function useToast() {
  return useContext(ToastContext);
}
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}
function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  return params.toString();
}
function categoriesFromParams(params) {
  return String(params.get("category") ?? "").split(",").filter((category) => categories.includes(category));
}

function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const timer = useRef();
  function flash(nextMessage) {
    setMessage(nextMessage);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(""), 2800);
  }
  return <ToastContext.Provider value={flash}>{children}{message && <div className="toast"><Check size={16} />{message}</div>}</ToastContext.Provider>;
}

function Protected({ children, admin = false }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <PageLoader />;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname, message: "Please login to continue" }} />;
  if (admin && !auth.isAdmin) return <Navigate to="/faqs" replace />;
  return children;
}

function PageLoader() {
  return <div className="page-loader"><span className="spinner" />Loading CrowdFAQ...</div>;
}

function FaqSkeletons() {
  return <div className="skeleton-list">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><span className="skeleton-line short" /><span className="skeleton-line title" /><span className="skeleton-line" /><span className="skeleton-line medium" /><span className="skeleton-line footer" /></div>)}</div>;
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem("crowdfaq_theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("crowdfaq_theme", dark ? "dark" : "light");
  }, [dark]);
  return <button className="icon-btn" title={dark ? "Use light mode" : "Use dark mode"} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
}

function Brand({ compact = false }) {
  return <Link className={`brand ${compact ? "brand-compact" : ""}`} to="/"><span className="brand-mark"><MessageCircle size={compact ? 17 : 19} /></span><span className="brand-name">Crowd<span>FAQ</span></span></Link>;
}

function HeaderSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get("search") ?? "");
  useEffect(() => {
    if (location.pathname === "/faqs") setSearch(new URLSearchParams(location.search).get("search") ?? "");
  }, [location.pathname, location.search]);
  function submit(event) {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/faqs?${queryString({ search: value })}` : "/faqs");
  }
  function clear() {
    setSearch("");
    if (location.pathname === "/faqs") navigate("/faqs");
  }
  return <form className="nav-search" role="search" onSubmit={submit}><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, description, or tags..." aria-label="Search FAQs" />{search && <button type="button" aria-label="Clear search" onClick={clear}><X size={14} /></button>}</form>;
}

function NotificationBell() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  async function load() {
    if (!auth.user) return;
    const data = await api("/notifications");
    setNotifications(data.notifications);
    setUnread(data.unreadCount);
  }
  useEffect(() => {
    load().catch(() => {});
    if (!auth.user) return undefined;
    const refresh = () => load().catch(() => {});
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [auth.user?._id]);
  async function markAllRead() {
    await patch("/notifications/read-all");
    setUnread(0);
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }
  return <div className="notification-wrap"><button className="icon-btn" title="Notifications" onClick={() => { setOpen(!open); load().catch(() => {}); }}><Bell size={18} />{unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}</button>{open && <div className="notification-panel"><div className="notification-heading"><b>Notifications</b>{unread > 0 && <button onClick={markAllRead}>Mark all read</button>}</div><div className="notification-list">{notifications.map((notification) => <Link className={notification.read ? "" : "unread"} key={notification._id} to={notification.faq ? `/faqs/${notification.faq}` : "/faqs"} onClick={() => setOpen(false)}><span>{notification.message}</span><small>{relativeTime(notification.createdAt)}</small></Link>)}{!notifications.length && <p>No notifications yet.</p>}</div></div>}</div>;
}

function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  function logout() {
    auth.logout();
    toast("See you soon!");
    navigate("/login");
  }
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Brand />
        <nav className="main-nav">
          <Link to="/faqs"><House size={17} /> FAQs</Link>
          {auth.user && <Link to="/profile"><User size={17} /> Profile</Link>}
          {auth.isAdmin && <Link to="/admin"><Shield size={17} /> Admin</Link>}
        </nav>
        <HeaderSearch />
        <div className="nav-actions">
          <ThemeToggle />
          {auth.user ? (
            <>
              <NotificationBell />
              <Link className="ask-button" to="/faqs/ask"><Plus size={17} /> Ask a Question</Link>
              <Link className="profile-btn" to="/profile">
                <span className="avatar avatar-blue">{initials(auth.user.name)}</span>
                <span className="profile-copy"><b>{auth.user.name}</b><small>{auth.user.reputation} rep</small></span>
              </Link>
              <button className="icon-btn" title="Logout" onClick={logout}><LogOut size={18} /></button>
            </>
          ) : <><Link className="ask-button" to="/faqs/ask"><Plus size={17} /> Ask a Question</Link><Link className="outline-button" to="/login"><LogIn size={16} /> Login</Link></>}
        </div>
      </div>
    </header>
  );
}

function Shell({ children }) {
  return <div className="app-shell"><Navbar />{children}<footer><Brand compact /><p>Built for ambitious interns, powered by shared experiences.</p><span>&copy; 2026 CrowdFAQ</span></footer><Chatbot /></div>;
}

function Chatbot() {
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
      toast(error.message);
      setMessages((current) => [...current, { role: "bot", text: "I could not answer that right now. Please try again shortly." }]);
    } finally {
      setBusy(false);
    }
  }
  return <>
    {!open && location.pathname === "/faqs" && <button className="chat-greeting" onClick={() => setOpen(true)}>Hii{auth.user ? `, ${auth.user.name.split(" ")[0]}` : ""}! Need any help?</button>}
    {open && <section className="chat-panel" aria-label="CrowdFAQ AI assistant">
      <header className="chat-header"><span className="chat-bot-icon"><Bot size={18} /></span><span><b>CrowdFAQ Assistant</b><small>Grounded in verified answers</small></span><button aria-label="Close chat" onClick={() => setOpen(false)}><X size={17} /></button></header>
      <div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
        <p>{message.text}</p>
        {!!message.sources?.length && <div className="chat-sources"><small>Community sources</small>{message.sources.map((source) => <Link key={source.id} to={`/faqs/${source.id}`} onClick={() => setOpen(false)}>{source.title}</Link>)}</div>}
        {message.suggestFaq && <Link className="chat-ask-link" to="/faqs/ask" onClick={() => setOpen(false)}><Plus size={14} /> Ask a new FAQ</Link>}
      </div>)}{busy && <div className="chat-message bot"><p>Checking verified community answers...</p></div>}<span ref={messagesEnd} /></div>
      <form className="chat-form" onSubmit={submit}><input maxLength="500" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about internships..." /><button disabled={busy || !input.trim()} aria-label="Send question"><Send size={16} /></button></form>
    </section>}
    <button className="chat-toggle" aria-label={open ? "Close AI assistant" : "Open AI assistant"} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Bot size={22} />}</button>
  </>;
}

function AuthPage({ register = false }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", branch: "", semester: "", rollNumber: "", rememberMe: false });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.state?.message) toast(location.state.message);
  }, [location.state, toast]);
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
      toast(register ? "Welcome to CrowdFAQ!" : `Welcome back, ${data.user.name}!`);
      navigate(location.state?.from ?? "/faqs", { replace: true });
    } catch (error) {
      setErrors(error.errors);
      setAlert(error.message);
      toast(error.message);
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
          {register && <Field label="Full name" error={errors.name}><input autoFocus required name="name" value={form.name} onChange={update} /></Field>}
          <Field label="Email address" error={errors.email}><input autoFocus={!register} required type="email" name="email" value={form.email} onChange={update} /></Field>
          <Field label="Password" error={errors.password}><input required minLength="8" type="password" name="password" value={form.password} onChange={update} /></Field>
          {register && <>
            <Field label="Confirm password" error={errors.confirmPassword}><input required type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} /></Field>
            <div className="form-row">
              <Field label="Branch" error={errors.branch}><select name="branch" value={form.branch} onChange={update}><option value="">Select</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></Field>
              <Field label="Semester" error={errors.semester}><select name="semester" value={form.semester} onChange={update}><option value="">Select</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester}>{semester}</option>)}</select></Field>
            </div>
            <Field label="Roll number (optional)"><input name="rollNumber" value={form.rollNumber} onChange={update} /></Field>
          </>}
          {!register && <label className="check-label"><input type="checkbox" name="rememberMe" checked={form.rememberMe} onChange={update} /> Remember me for 30 days</label>}
          <button className="primary-button" disabled={busy}>{busy ? "Please wait..." : register ? "Create account" : "Login"}</button>
        </form>
        <p className="auth-switch">{register ? "Already have an account?" : "New to CrowdFAQ?"} <Link to={register ? "/login" : "/register"}>{register ? "Login" : "Register"}</Link></p>
      </div>
    </div>
  );
}

function AdminLogin() {
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
      toast("Admin access granted");
      navigate("/admin");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page admin-login-page"><div className="auth-card admin-login-card">
      <span className="admin-mark"><Shield size={22} /></span><h1>Admin portal</h1><p>Restricted CrowdFAQ moderation access.</p>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Admin email"><input autoFocus required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Password"><input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
        <button className="primary-button" disabled={busy}>{busy ? "Checking..." : "Enter dashboard"}</button>
      </form>
      <Link className="muted-link" to="/faqs">Back to public FAQs</Link>
    </div></div>
  );
}

function Field({ label, error, children }) {
  return <label className="field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}

function LandingPage() {
  const toast = useToast();
  const [landingData, setLandingData] = useState(null);
  useEffect(() => {
    api("/landing-stats").then(setLandingData).catch((error) => toast(error.message));
  }, []);
  const stats = landingData ? [
    [landingData.stats.questionsAsked.toLocaleString(), "Questions Asked"],
    [landingData.stats.internsHelped.toLocaleString(), "Interns Helped"],
    [landingData.stats.companiesCovered.toLocaleString(), "Companies Covered"],
    [`${landingData.stats.answeredRate}%`, "Answered Rate"],
  ] : [["--", "Questions Asked"], ["--", "Interns Helped"], ["--", "Companies Covered"], ["--", "Answered Rate"]];
  return <Shell><main className="landing-page">
    <section className="landing-hero">
      <span className="landing-orb orb-indigo" />
      <span className="landing-orb orb-violet" />
      <span className="landing-orb orb-cyan" />
      <div className="landing-copy"><span className="section-label"><Sparkles size={14} /> Built by interns, for interns</span><h1>Find answers. <span>Share experience.</span></h1><p>Real internship questions and practical answers from students who have been there.</p><div className="landing-buttons"><Link className="cta-button" to="/faqs"><Search size={16} /> Browse FAQs</Link><Link className="outline-button" to="/faqs/ask"><Plus size={16} /> Ask a Question</Link></div></div>
      <aside className="hero-community-card">
        <div className="hero-community-stats">{stats.map(([value, label]) => <div className="hero-community-stat" key={label}><b>{value}</b><span>{label}</span></div>)}</div>
        <div className="hero-trending"><small><TrendingUp size={13} /> Trending Right Now</small><div className="hero-topic-list">{landingData?.trendingTopics.map((topic, index) => <Link className={`hero-topic topic-${index + 1}`} key={topic.category} to={`/faqs?${queryString({ category: topic.category })}`}>{topic.category}<span>{topic.count}</span></Link>)}{landingData && !landingData.trendingTopics.length && <em>No topics yet</em>}</div></div>
      </aside>
    </section>
    <section className="landing-guide"><div><span className="section-label"><Sparkles size={14} /> Community-powered guidance</span><h2>Start with shared experience.</h2><p>Browse practical answers from interns or ask the community when your question is new.</p></div><div className="landing-action-grid"><Link className="landing-action featured" to="/faqs/ask"><Plus size={19} /><h3>Ask a Question</h3><p>Got a doubt? The community has your back.</p><span>Post now <ArrowRight size={14} /></span></Link><Link className="landing-action" to="/faqs"><Search size={19} /><h3>Browse FAQs</h3><p>Explore answers shared by students with real experience.</p><span>Explore FAQs <ArrowRight size={14} /></span></Link></div></section>
  </main></Shell>;
}

function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [faqs, setFaqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ categories: categoriesFromParams(searchParams), company: "", role: "", status: "all", sort: "latest" });
  const latestRequest = useRef(0);
  const debouncedSearch = useDebounced(search, 400);
  const debouncedCompany = useDebounced(filters.company, 400);
  const debouncedRole = useDebounced(filters.role, 400);
  const toast = useToast();
  const urlSearch = searchParams.get("search") ?? "";
  const urlCategory = searchParams.get("category") ?? "";
  const filterKey = JSON.stringify({ search: debouncedSearch, company: debouncedCompany, role: debouncedRole, categories: filters.categories, status: filters.status, sort: filters.sort });
  async function fetchFaqs(nextPage = 1, append = false) {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const params = queryString({ search: debouncedSearch, company: debouncedCompany, role: debouncedRole, category: filters.categories.join(","), status: filters.status, sort: filters.sort, page: nextPage, limit: 10 });
      const data = await api(`/faqs?${params}`);
      if (requestId !== latestRequest.current) return;
      setFaqs((current) => append ? [...current, ...data.faqs] : data.faqs);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      toast(error.message);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }
  useEffect(() => { fetchFaqs(); }, [filterKey]);
  useEffect(() => {
    setSearch(urlSearch);
    setFilters((current) => ({ ...current, categories: categoriesFromParams(searchParams), company: "", role: "", status: "all" }));
  }, [urlSearch, urlCategory]);
  function toggleCategory(category) {
    setFilters((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((item) => item !== category) : [...current.categories, category] }));
  }
  function clearFilters() {
    setSearch("");
    setSearchParams({});
    setFilters({ categories: [], company: "", role: "", status: "all", sort: "latest" });
  }
  return (
    <Shell>
      <main className="page-content">
        <div className="section-heading"><div><span className="section-label"><MessageCircle size={14} /> Community knowledge</span><h2>Internship FAQs</h2></div><button className="filter-mobile" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={16} /> Filters</button></div>
        <div className="feed-layout">
          <aside className={`filter-panel ${filtersOpen ? "mobile-open" : ""}`}>
            <div className="panel-title"><span>Filters</span><button onClick={clearFilters}>Clear all</button></div>
            <FilterSection title="Category">{categories.map((category) => <label className="check-label" key={category}><input type="checkbox" checked={filters.categories.includes(category)} onChange={() => toggleCategory(category)} />{category}</label>)}</FilterSection>
            <FilterSection title="Company"><input value={filters.company} onChange={(event) => setFilters({ ...filters, company: event.target.value })} placeholder="e.g. Google" /></FilterSection>
            <FilterSection title="Role"><input value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} placeholder="e.g. SDE Intern" /></FilterSection>
            <FilterSection title="Status">{["all", "open", "answered", "closed"].map((status) => <label className="check-label" key={status}><input type="radio" name="status" checked={filters.status === status} onChange={() => setFilters({ ...filters, status })} />{status[0].toUpperCase() + status.slice(1)}</label>)}</FilterSection>
          </aside>
          <section className="feed-panel">
            <div className="feed-toolbar"><div className="sort-tabs">{[["latest", "Latest"], ["answered", "Most Answered"], ["upvoted", "Most Upvoted"], ["unanswered", "Unanswered"]].map(([value, label]) => <button key={value} className={filters.sort === value ? "active" : ""} onClick={() => setFilters({ ...filters, sort: value })}>{label}</button>)}</div><span>Showing {faqs.length} of {total} results</span></div>
            <div className="feed-list">{faqs.map((faq) => <FaqCard key={faq._id} faq={faq} onChange={(changed) => setFaqs((items) => items.map((item) => item._id === changed._id ? changed : item))} />)}
              {!loading && !faqs.length && <EmptyState />}
              {loading && !faqs.length && <FaqSkeletons />}
            </div>
            {hasMore && <button className="load-more" disabled={loading} onClick={() => fetchFaqs(page + 1, true)}>{loading ? "Loading..." : "Load more questions"} <ChevronDown size={16} /></button>}
          </section>
        </div>
      </main>
    </Shell>
  );
}

function FilterSection({ title, children }) {
  return <div className="filter-section"><b>{title}</b>{children}</div>;
}

function EmptyState() {
  return <div className="empty-state"><Search size={30} /><h3>No results found</h3><p>Try another filter or ask the question yourself.</p><Link className="ask-button" to="/faqs/ask"><Plus size={16} /> Ask a question</Link></div>;
}

function FaqCard({ faq, onChange }) {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const name = authorName(faq);
  async function upvote(event) {
    event.preventDefault();
    if (!auth.user) return navigate("/login", { state: { from: "/faqs", message: "Please login to continue" } });
    try {
      const data = await post(`/faqs/${faq._id}/upvote`, {});
      onChange({ ...faq, upvotes: data.upvotes, isTrending: data.upvotes > 5 || faq.answerCount > 3 });
      toast(data.upvoted ? "Upvoted!" : "Upvote removed");
    } catch (error) {
      toast(error.message);
    }
  }
  return (
    <article className="faq-card"><div className="faq-content">
      <div className="faq-topline"><span className="topic-badge violet">{faq.category}</span>{faq.company && <span className="mini-chip">{faq.company}</span>}{faq.role && <span className="mini-chip">{faq.role}</span>}{faq.isTrending && <span className="trending"><TrendingUp size={12} /> Trending</span>}<span className={`status ${faq.status}`}><i />{faq.status}</span></div>
      <Link to={`/faqs/${faq._id}`}><h3>{faq.title}</h3></Link><p>{faq.description}</p><Link className="faq-read-more" to={`/faqs/${faq._id}`}>View full FAQ <ArrowRight size={13} /></Link>
      <div className="tag-row">{faq.tags?.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="faq-footer"><AuthorIdentity item={faq} meta={`asked ${relativeTime(faq.createdAt)}`} />
        <div className="faq-metrics"><button className="metric-button vote" onClick={upvote}><ArrowUp size={14} /> {faq.upvotes}</button><span><MessageCircle size={14} /> {faq.answerCount}</span><span><Eye size={14} /> {faq.viewCount}</span></div>
      </div>
    </div></article>
  );
}

function AskFaqPage() {
  const empty = { title: "", description: "", category: "", company: "", role: "", branch: "", semester: "", tags: [], tag: "", isAnonymous: false };
  const [form, setForm] = useState(empty);
  const [similar, setSimilar] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const debouncedTitle = useDebounced(form.title, 500);
  const navigate = useNavigate();
  const toast = useToast();
  useEffect(() => {
    if (debouncedTitle.length < 5 || dismissed) return setSimilar([]);
    api(`/faqs/similar?${queryString({ title: debouncedTitle })}`).then((data) => setSimilar(data.faqs)).catch(() => {});
  }, [debouncedTitle, dismissed]);
  function update(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (name === "title") setDismissed(false);
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
      const data = await post("/faqs", { ...form, semester: form.semester || undefined });
      toast("Your question is live!");
      navigate(`/faqs/${data.faq._id}`);
    } catch (error) {
      setErrors(error.errors);
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  return <Shell><main className="narrow-page"><div className="page-title"><span className="section-label"><Plus size={14} /> Ask the community</span><h1>Post a new question</h1><p>Include enough detail for other students to give a useful answer.</p></div>
    <form className="surface form-grid" onSubmit={submit}>
      <Field label={`Title (${form.title.length}/200)`} error={errors.title}><input autoFocus required minLength="10" maxLength="200" name="title" value={form.title} onChange={update} /></Field>
      {!!similar.length && <div className="similar-box"><b>Similar questions already exist - check them before posting</b>{similar.map((faq) => <a key={faq._id} href={`/faqs/${faq._id}`} target="_blank" rel="noreferrer">{faq.title}</a>)}<button type="button" onClick={() => { setDismissed(true); setSimilar([]); }}>Post anyway</button></div>}
      <Field label={`Description (${form.description.length}/5000)`} error={errors.description}><textarea required minLength="20" maxLength="5000" name="description" value={form.description} onChange={update} /></Field>
      <div className="form-row"><Field label="Category" error={errors.category}><select required name="category" value={form.category} onChange={update}><option value="">Select</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Company"><input name="company" value={form.company} onChange={update} placeholder="e.g. Google" /></Field></div>
      <div className="form-row"><Field label="Role"><input name="role" value={form.role} onChange={update} placeholder="e.g. SDE Intern" /></Field><Field label="Branch"><select name="branch" value={form.branch} onChange={update}><option value="">Select</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></Field><Field label="Semester"><select name="semester" value={form.semester} onChange={update}><option value="">Select</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester}>{semester}</option>)}</select></Field></div>
      <Field label="Tags (press Enter or comma, up to 5)" error={errors.tags}><input name="tag" value={form.tag} onChange={update} onKeyDown={addTag} placeholder="e.g. interview" /></Field>
      <div className="tag-row">{form.tags.map((tag) => <button type="button" key={tag} onClick={() => setForm({ ...form, tags: form.tags.filter((item) => item !== tag) })}>#{tag} <X size={11} /></button>)}</div>
      <label className="check-label"><input type="checkbox" name="isAnonymous" checked={form.isAnonymous} onChange={update} /> Post anonymously</label>
      <button className="primary-button" disabled={busy}>{busy ? "Posting..." : "Post question"}</button>
    </form>
  </main></Shell>;
}

function FaqDetailPage() {
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
  const viewed = useRef(false);
  async function loadFaq() {
    const data = await api(`/faqs/${id}`);
    setFaq({ ...data.faq, saved: data.saved, upvoted: data.upvoted, followed: data.followed });
  }
  async function loadAnswers() {
    setAnswers((await api(`/faqs/${id}/answers?sort=${sort}`)).answers);
  }
  useEffect(() => { loadFaq().catch((error) => toast(error.message)); }, [id]);
  useEffect(() => { loadAnswers().catch((error) => toast(error.message)); }, [id, sort]);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    patch(`/faqs/${id}/view`).then(({ viewCount }) => setFaq((current) => current ? { ...current, viewCount } : current)).catch(() => {});
  }, [id]);
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
      toast(action === "save" ? data.saved ? "Saved to your bookmarks" : "Removed from bookmarks" : data.upvoted ? "Upvoted!" : "Upvote removed");
    } catch (error) { toast(error.message); }
  }
  async function toggleFollow() {
    if (!requireLogin()) return;
    try {
      const data = await post(`/faqs/${id}/follow`, {});
      setFaq((current) => ({ ...current, followed: data.followed }));
      toast(data.followed ? "Following this FAQ" : "FAQ follow removed");
    } catch (error) { toast(error.message); }
  }
  async function submitAnswer(event) {
    event.preventDefault();
    if (ownsFaq) return toast("You cannot answer your own FAQ");
    setBusy(true);
    try {
      await post(`/faqs/${id}/answers`, { body: answerBody, isAnonymous: anonymous });
      setAnswerBody("");
      setAnonymous(false);
      toast("Answer posted successfully");
      await Promise.all([loadFaq(), loadAnswers()]);
    } catch (error) { toast(error.message); } finally { setBusy(false); }
  }
  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    toast("Link copied to clipboard!");
  }
  async function deleteFaq() {
    if (faq.answerCount > 0) return toast("Answered FAQs require admin permission to delete");
    if (!window.confirm("Delete this unanswered FAQ?")) return;
    try {
      await remove(`/faqs/${id}`);
      toast("FAQ deleted");
      navigate("/faqs");
    } catch (error) { toast(error.message); }
  }
  if (!faq) return <Shell><PageLoader /></Shell>;
  const ownsFaq = auth.user?._id === faq.author?._id;
  return <Shell><main className="detail-page">
    <section className="surface detail-header">
      <div className="faq-topline"><span className="topic-badge violet">{faq.category}</span>{faq.company && <span className="mini-chip">{faq.company}</span>}{faq.role && <span className="mini-chip">{faq.role}</span>}<span className={`status ${faq.status}`}><i />{faq.status}</span></div>
      <h1>{faq.title}</h1><p className="detail-copy">{faq.description}</p><div className="tag-row">{faq.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="detail-meta"><AuthorIdentity item={faq} meta={`${faq.author?.reputation ?? 0} reputation - asked ${relativeTime(faq.createdAt)}`} /><span><Eye size={15} /> {faq.viewCount} views</span></div>
      <div className="detail-actions"><button className={faq.upvoted ? "active" : ""} onClick={() => toggleFaqAction("upvote")}><ArrowUp size={16} /> {faq.upvotes} Upvote</button><button className={faq.saved ? "active" : ""} onClick={() => toggleFaqAction("save")}><Bookmark size={16} /> {faq.saved ? "Saved" : "Save"}</button><button className={faq.followed ? "active" : ""} onClick={toggleFollow}>{faq.followed ? <UserCheck size={16} /> : <UserPlus size={16} />} {faq.followed ? "Following" : "Follow"}</button><button onClick={share}><Link2 size={16} /> Share</button><button onClick={() => requireLogin() && setReport({ type: "faq", id })}><CircleAlert size={16} /> Report</button>{ownsFaq && <button className="danger" title={faq.answerCount > 0 ? "Answered FAQs require admin permission to delete" : "Delete this unanswered FAQ"} onClick={deleteFaq}><Trash2 size={16} /> Delete FAQ</button>}</div>
    </section>
    <section className="surface summary-box"><span className="section-label"><Bot size={15} /> AI summary</span>{faq.aiSummary ? <><p>{faq.aiSummary}</p><small>Generated from verified community answers - updated {relativeTime(faq.aiSummaryUpdatedAt)}</small></> : <p>An AI summary will appear after an admin verifies a community answer.</p>}<small>Updates automatically when verified answers change.</small></section>
    <section className="answers-section"><div className="answers-heading"><h2>{faq.answerCount} Answers</h2><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="upvoted">Most upvoted</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select></div>
      {answers.map((answer) => <AnswerCard key={answer._id} answer={answer} ownsFaq={ownsFaq} onReload={() => Promise.all([loadFaq(), loadAnswers()])} onReport={() => setReport({ type: "answer", id: answer._id })} />)}
      {!answers.length && <div className="surface empty-state"><MessageCircle size={28} /><h3>No answers yet</h3><p>Be the first to help this student.</p></div>}
    </section>
    <section className="surface answer-form" id="answer"><h2>Write Your Answer</h2>{ownsFaq ? <p className="answer-restriction">You cannot answer your own FAQ.</p> : auth.user ? <form onSubmit={submitAnswer}><textarea required minLength="20" maxLength="5000" value={answerBody} onChange={(event) => setAnswerBody(event.target.value)} placeholder="Share a clear, practical answer..." /><div className="answer-form-footer"><label className="check-label"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /> Answer anonymously</label><small>{answerBody.length}/5000</small><button className="primary-button" disabled={busy}>{busy ? "Posting..." : "Post answer"}</button></div></form> : <div className="login-prompt">You must be logged in to post an answer. <Link className="outline-button" to="/login" state={{ from: `/faqs/${id}` }}>Login</Link></div>}</section>
    {report && <ReportModal report={report} onClose={() => setReport(null)} />}
  </main></Shell>;
}

function AnswerCard({ answer, ownsFaq, onReload, onReport }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const name = authorName(answer);
  const hasLongAnswer = answer.body.length > 320;
  const ownsAnswer = auth.user?._id === answer.author?._id;
  const upvoted = answer.upvotedBy.includes(auth.user?._id);
  const downvoted = answer.downvotedBy.includes(auth.user?._id);
  async function vote(type) {
    if (!auth.user) return navigate("/login", { state: { message: "Please login to continue" } });
    try { await post(`/answers/${answer._id}/${type}`, {}); toast(type === "upvote" ? "Vote updated" : "Feedback updated"); onReload(); } catch (error) { toast(error.message); }
  }
  async function accept() {
    try { await patch(`/answers/${answer._id}/accept`); toast("Best Answer marked!"); onReload(); } catch (error) { toast(error.message); }
  }
  async function postComment(event) {
    event.preventDefault();
    if (!auth.user) return navigate("/login", { state: { message: "Please login to continue" } });
    if (ownsFaq) return toast("You cannot comment on your own FAQ");
    setCommentBusy(true);
    try {
      await post(`/answers/${answer._id}/comments`, { body: comment });
      setComment("");
      toast("Comment posted");
      onReload();
    } catch (error) { toast(error.message); } finally { setCommentBusy(false); }
  }
  async function deleteAnswer() {
    if (answer.isVerified) return toast("Verified answers require admin permission to delete");
    if (!window.confirm("Delete your answer?")) return;
    try {
      await remove(`/answers/${answer._id}`);
      toast("Answer deleted");
      onReload();
    } catch (error) { toast(error.message); }
  }
  return <article className={`surface answer-card ${answer.isAccepted ? "accepted" : ""}`}>{answer.isAccepted && <div className="best-answer"><CheckCircle2 size={15} /> Best Answer</div>}<div className="answer-card-header"><AuthorIdentity item={answer} color="green" meta={`${answer.author?.reputation ?? 0} reputation - answered ${relativeTime(answer.createdAt)}`} /><span className={`verification-badge ${answer.isVerified ? "verified" : "unverified"}`}>{answer.isVerified ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}{answer.isVerified ? "Verified" : "Unverified"}</span></div><p className={`answer-body ${hasLongAnswer && !expanded ? "collapsed" : ""}`}>{answer.body}</p>{hasLongAnswer && <button className="answer-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Show more"} <ChevronDown size={14} /></button>}<div className="answer-actions"><button className={upvoted ? "active" : ""} onClick={() => vote("upvote")}><ArrowUp size={15} /> {answer.upvotes}</button><button className={downvoted ? "active" : ""} onClick={() => vote("downvote")}><ArrowDown size={15} /> {answer.downvotes}</button>{ownsFaq && <button disabled={!answer.isVerified} title={answer.isVerified ? "Mark as Best Answer" : "Admin verification required"} onClick={accept}><Check size={15} /> Accept</button>}<button onClick={onReport}><CircleAlert size={15} /> Report</button>{ownsAnswer && <button className="danger" title={answer.isVerified ? "Verified answers require admin permission to delete" : "Delete your answer"} onClick={deleteAnswer}><Trash2 size={15} /> Delete</button>}</div><div className="comment-thread">{answer.comments?.map((item) => <div className="comment" key={item._id}>{item.author?._id ? <Link to={`/profile/${item.author._id}`}><b>{item.author.name}</b></Link> : <b>Student</b>}<span>{item.body}</span><small>{relativeTime(item.createdAt)}</small></div>)}{ownsFaq ? <p className="comment-restriction">You cannot comment on your own FAQ.</p> : <form className="comment-form" onSubmit={postComment}><input required minLength="2" maxLength="500" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment or mention @FirstName..." /><button disabled={commentBusy || !comment.trim()}><Send size={14} /></button></form>}</div></article>;
}

function ReportModal({ report, onClose }) {
  const [reason, setReason] = useState("spam");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try { await post(`/${report.type === "faq" ? "faqs" : "answers"}/${report.id}/report`, { reason }); toast("Report submitted"); onClose(); } catch (error) { toast(error.message); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="composer" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><button type="button" className="close-button" onClick={onClose}><X size={18} /></button><h2>Report content</h2><p>Choose the reason that best describes the issue.</p>{reportReasons.map((item) => <label className="check-label" key={item}><input type="radio" name="reason" checked={reason === item} onChange={() => setReason(item)} />{item[0].toUpperCase() + item.slice(1)}</label>)}<button className="primary-button" disabled={busy}>{busy ? "Submitting..." : "Submit report"}</button></form></div>;
}

function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const profileId = id ?? auth.user?._id;
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState([]);
  const [network, setNetwork] = useState({ followers: [], following: [] });
  const [networkTab, setNetworkTab] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const toast = useToast();
  const own = profileId === auth.user?._id;
  async function load() {
    const profile = await api(`/users/${profileId}`);
    setData(profile);
    setForm(profile.user);
    if (own) {
      const [savedFaqs, follows] = await Promise.all([api(`/users/${profileId}/saved-faqs`), api(`/users/${profileId}/follows`)]);
      setSaved(savedFaqs.faqs);
      setNetwork(follows);
    }
  }
  useEffect(() => { load().catch((error) => toast(error.message)); }, [profileId]);
  async function save(event) {
    event.preventDefault();
    try {
      const { user } = await patch(`/users/${profileId}`, form);
      auth.updateUser(user);
      setData({ ...data, user });
      setEditing(false);
      toast("Profile updated");
    } catch (error) { toast(error.message); }
  }
  async function toggleProfileFollow() {
    if (!auth.user) return navigate("/login", { state: { from: `/profile/${profileId}`, message: "Please login to continue" } });
    try {
      const result = await post(`/users/${profileId}/follow`, {});
      setData((current) => ({ ...current, followedByViewer: result.followed, followerCount: result.followerCount }));
      toast(result.followed ? "Following this student" : "Student unfollowed");
    } catch (error) { toast(error.message); }
  }
  if (!data) return <Shell><PageLoader /></Shell>;
  const { user, faqs, answers, followerCount, followingCount, followedByViewer } = data;
  return <Shell><main className="profile-page"><section className="surface profile-header"><span className="avatar avatar-blue large">{initials(user.name)}</span><div><h1>{user.name}</h1><p>{user.branch || "Branch not set"} {user.semester && `- Semester ${user.semester}`}</p><b>{user.reputation} reputation</b>{user.bio && <p className="profile-bio">{user.bio}</p>}</div>{own ? <button className="outline-button" onClick={() => setEditing(!editing)}><Pencil size={15} /> Edit profile</button> : <button className={`outline-button ${followedByViewer ? "active" : ""}`} onClick={toggleProfileFollow}>{followedByViewer ? <UserCheck size={15} /> : <UserPlus size={15} />}{followedByViewer ? "Following" : "Follow student"}</button>}</section>
    <section className="stats-grid"><Stat label="Questions asked" value={user.questionsAsked} /><Stat label="Answers given" value={user.answersGiven} /><Stat label="Accepted answers" value={user.acceptedAnswers} /><Stat label="Reputation" value={user.reputation} /><Stat label="Followers" value={followerCount} active={networkTab === "followers"} onClick={own ? () => setNetworkTab(networkTab === "followers" ? null : "followers") : undefined} /><Stat label="Following" value={followingCount} active={networkTab === "following"} onClick={own ? () => setNetworkTab(networkTab === "following" ? null : "following") : undefined} /></section>
    {editing && <form className="surface form-grid profile-edit" onSubmit={save}><h2>Edit profile</h2><Field label="Name"><input value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><div className="form-row"><Field label="Branch"><select value={form.branch ?? ""} onChange={(event) => setForm({ ...form, branch: event.target.value })}><option value="">Select</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></Field><Field label="Semester"><select value={form.semester ?? ""} onChange={(event) => setForm({ ...form, semester: event.target.value })}><option value="">Select</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester}>{semester}</option>)}</select></Field></div><Field label={`Bio (${form.bio?.length ?? 0}/200)`}><textarea maxLength="200" value={form.bio ?? ""} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></Field><button className="primary-button">Save profile</button></form>}
    <ProfileList title="Recent questions" empty="No questions posted yet.">{faqs.map((faq) => <Link key={faq._id} to={`/faqs/${faq._id}`}>{faq.title}<small>{faq.category} - {relativeTime(faq.createdAt)}</small></Link>)}</ProfileList>
    <ProfileList title="Recent answers" empty="No answers posted yet.">{answers.map((answer) => <Link key={answer._id} to={`/faqs/${answer.faq?._id}`}>{answer.faq?.title}<small>{answer.body.slice(0, 100)}</small></Link>)}</ProfileList>
    {own && <ProfileList title="Saved FAQs" empty="No bookmarks yet.">{saved.map((faq) => <Link key={faq._id} to={`/faqs/${faq._id}`}>{faq.title}<small>{faq.category}</small></Link>)}</ProfileList>}
    {own && networkTab && <section className="surface network-panel"><PrivateNetworkList title={networkTab === "followers" ? "Your followers" : "You follow"} users={network[networkTab]} /></section>}
  </main></Shell>;
}

function PrivateNetworkList({ title, users }) {
  return <div><h2>{title}</h2>{users.length ? users.map((user) => <Link className="network-user" key={user._id} to={`/profile/${user._id}`}><span className="avatar avatar-blue">{initials(user.name)}</span><span><b>{user.name}</b><small>{user.reputation} reputation</small></span></Link>) : <p>No students yet.</p>}</div>;
}

function ProfileList({ title, empty, children }) {
  return <section className="surface profile-list"><h2>{title}</h2>{children.length ? children : <p>{empty}</p>}</section>;
}
function Stat({ label, value, onClick, active = false }) {
  const content = <><b>{value}</b><span>{label}</span></>;
  return onClick ? <button className={`surface stat-card clickable ${active ? "active" : ""}`} onClick={onClick}>{content}</button> : <div className="surface stat-card">{content}</div>;
}

function AdminPage() {
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
      const [nextStats, nextUsers, nextFaqs, nextAnswers, nextReports] = await Promise.all([api("/admin/stats"), api("/admin/users"), api("/admin/faqs"), api("/admin/answers"), api("/admin/reports")]);
      setStats(nextStats); setUsers(nextUsers.users); setFaqs(nextFaqs.faqs); setAnswers(nextAnswers.answers); setReports(nextReports.reports);
    } catch (error) { toast(error.message); }
  }
  useEffect(() => { load(); }, []);
  async function ban(id) { try { await patch(`/admin/users/${id}/ban`); toast("User status updated"); load(); } catch (error) { toast(error.message); } }
  async function deleteFaq(id) { if (!window.confirm("Delete this FAQ and all of its answers?")) return; try { await remove(`/admin/faqs/${id}`); toast("FAQ deleted"); load(); } catch (error) { toast(error.message); } }
  async function resolve(id) { try { await patch(`/admin/reports/${id}`); toast("Report resolved"); load(); } catch (error) { toast(error.message); } }
  async function verifyAnswer(id) { try { const data = await patch(`/admin/answers/${id}/verify`); toast(data.summaryRefresh.updated ? data.answer.isVerified ? "Answer verified and AI summary updated" : "Answer marked unverified and AI summary refreshed" : data.answer.isVerified ? "Answer verified, but AI summary could not update" : "Answer marked unverified"); load(); } catch (error) { toast(error.message); } }
  async function deleteReportedContent(report) {
    if (!window.confirm("Delete the reported content?")) return;
    try {
      await remove(report.contentType === "faq" ? `/admin/faqs/${report.content?._id}` : `/answers/${report.content?._id}`);
      toast("Reported content deleted");
      load();
    } catch (error) { toast(error.message); }
  }
  if (!stats) return <Shell><PageLoader /></Shell>;
  const value = search.toLowerCase();
  const visibleUsers = users.filter((user) => !value || user.name.toLowerCase().includes(value) || user.email.toLowerCase().includes(value));
  const visibleFaqs = faqs.filter((faq) => !value || faq.title.toLowerCase().includes(value));
  return <Shell><main className="admin-page"><aside className="admin-sidebar"><span><Shield size={17} /> Admin dashboard</span>{[["overview", "Overview"], ["users", "Users"], ["faqs", "FAQs"], ["answers", "Answers"], ["reports", "Reports"]].map(([value, label]) => <button className={tab === value ? "active" : ""} key={value} onClick={() => { setTab(value); setSearch(""); }}>{label}</button>)}</aside><section className="admin-main">
    <div className="page-title"><span className="section-label"><Shield size={14} /> Moderation</span><h1>{tab[0].toUpperCase() + tab.slice(1)}</h1></div>
    {(tab === "users" || tab === "faqs") && <div className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${tab}...`} /></div>}
    {tab === "overview" && <div className="stats-grid">{Object.entries({ "Total users": stats.users, "Total FAQs": stats.faqs, "Total answers": stats.answers, "Open FAQs": stats.openFaqs, "Answered FAQs": stats.answeredFaqs, "Reports pending": stats.reportsPending }).map(([label, value]) => <Stat key={label} label={label} value={value} />)}</div>}
    {tab === "users" && <AdminTable headings={["Name", "Email", "Branch", "Rep", "Questions", "Answers", "Action"]}>{visibleUsers.map((user) => <tr key={user._id}><td><Link to={`/profile/${user._id}`}>{user.name}</Link></td><td>{user.email}</td><td>{user.branch || "-"}</td><td>{user.reputation}</td><td>{user.questionsAsked}</td><td>{user.answersGiven}</td><td><button className="table-button" onClick={() => ban(user._id)}>{user.isBanned ? "Unban" : "Ban"}</button></td></tr>)}</AdminTable>}
    {tab === "faqs" && <AdminTable headings={["Title", "Author", "Category", "Status", "Answers", "Action"]}>{visibleFaqs.map((faq) => <tr key={faq._id}><td><Link to={`/faqs/${faq._id}`}>{faq.title}</Link></td><td>{profilePath(faq) ? <Link to={profilePath(faq)}>{authorName(faq)}</Link> : authorName(faq)}</td><td>{faq.category}</td><td>{faq.status}</td><td>{faq.answerCount}</td><td><button className="table-button danger" onClick={() => deleteFaq(faq._id)}><Trash2 size={14} /> Delete</button></td></tr>)}</AdminTable>}
    {tab === "answers" && <AdminTable headings={["Answer", "FAQ", "Author", "Status", "Action"]}>{answers.map((answer) => <tr key={answer._id}><td>{answer.body.slice(0, 90)}</td><td><Link to={`/faqs/${answer.faq?._id}`}>{answer.faq?.title}</Link></td><td>{profilePath(answer) ? <Link to={profilePath(answer)}>{authorName(answer)}</Link> : authorName(answer)}</td><td><span className={`verification-badge ${answer.isVerified ? "verified" : "unverified"}`}>{answer.isVerified ? "Verified" : "Unverified"}</span></td><td><button className="table-button" onClick={() => verifyAnswer(answer._id)}>{answer.isVerified ? "Mark unverified" : "Verify answer"}</button></td></tr>)}</AdminTable>}
    {tab === "reports" && <AdminTable headings={["Type", "Reporter", "Reason", "Content", "Date", "Status", "Action"]}>{reports.map((report) => <tr key={report._id}><td>{report.contentType}</td><td>{report.reporter?.name}</td><td>{report.reason}</td><td>{report.content?.title ?? report.content?.body?.slice(0, 70) ?? "Content removed"}</td><td>{new Date(report.createdAt).toLocaleDateString()}</td><td>{report.resolved ? "Resolved" : "Pending"}</td><td className="table-actions">{!report.resolved && <button className="table-button" onClick={() => resolve(report._id)}>Dismiss</button>}{report.content && <button className="table-button danger" onClick={() => deleteReportedContent(report)}>Delete content</button>}</td></tr>)}</AdminTable>}
  </section></main></Shell>;
}
function AdminTable({ headings, children }) {
  return <div className="surface table-wrap"><table><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function App() {
  return <ToastProvider><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/register" element={<AuthPage register />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/faqs" element={<FeedPage />} />
    <Route path="/faqs/ask" element={<Protected><AskFaqPage /></Protected>} />
    <Route path="/faqs/:id" element={<FaqDetailPage />} />
    <Route path="/faqs/:id/answer" element={<Protected><FaqDetailPage /></Protected>} />
    <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
    <Route path="/profile/:id" element={<ProfilePage />} />
    <Route path="/admin/*" element={<Protected admin><AdminPage /></Protected>} />
    <Route path="*" element={<Navigate to="/faqs" replace />} />
  </Routes></ToastProvider>;
}

export default App;
