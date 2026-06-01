import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  BookmarkCheck,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Code2,
  Eye,
  FileText,
  Flame,
  GraduationCap,
  House,
  Lightbulb,
  MessageCircle,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";

const categories = [
  { name: "All topics", icon: Sparkles, count: "2.4k", color: "blue" },
  { name: "Interview Prep", icon: Target, count: "486", color: "violet" },
  { name: "Coding Rounds", icon: Code2, count: "392", color: "cyan" },
  { name: "Resume & Portfolio", icon: FileText, count: "274", color: "orange" },
  { name: "Application Process", icon: Send, count: "361", color: "pink" },
  { name: "Stipend & Pay", icon: CircleDollarSign, count: "198", color: "green" },
  { name: "Work Culture", icon: Building2, count: "167", color: "purple" },
];

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const demoFaqs = [
  {
    id: 1,
    title: "How should I prepare for Google's SDE internship coding rounds?",
    excerpt:
      "I have my online assessment in two weeks and want to focus on the highest-impact topics. What was the interview pattern like for recent applicants?",
    category: "Coding Rounds",
    company: "Google",
    tags: ["DSA", "Google", "SDE Intern"],
    votes: 148,
    answers: 26,
    views: "2.8k",
    author: "Aarav Mehta",
    initials: "AM",
    time: "2 hours ago",
    status: "Answered",
    trending: true,
    color: "violet",
  },
  {
    id: 2,
    title: "Is a cover letter still useful when applying for product internships?",
    excerpt:
      "Most portals mark it as optional, but I am applying to early-stage startups and product teams. Does a tailored letter actually improve the odds?",
    category: "Application Process",
    company: "Startups",
    tags: ["Cover Letter", "Product"],
    votes: 87,
    answers: 14,
    views: "1.6k",
    author: "Meera Kapoor",
    initials: "MK",
    time: "4 hours ago",
    status: "Answered",
    trending: false,
    color: "pink",
  },
  {
    id: 3,
    title: "What is a fair stipend for a remote data analyst internship in 2025?",
    excerpt:
      "I received an offer from a mid-size SaaS startup and would like to understand the usual stipend range before discussing the final offer.",
    category: "Stipend & Pay",
    company: "SaaS",
    tags: ["Remote", "Data Analyst", "Negotiation"],
    votes: 64,
    answers: 9,
    views: "980",
    author: "Kabir Singh",
    initials: "KS",
    time: "6 hours ago",
    status: "Open",
    trending: false,
    color: "green",
  },
  {
    id: 4,
    title: "Microsoft Explore internship: how different is the interview from SWE?",
    excerpt:
      "I am a second-year student shortlisted for Explore. Should I expect system design questions or spend all my time practicing coding and behavioral prep?",
    category: "Interview Prep",
    company: "Microsoft",
    tags: ["Microsoft", "Interview", "Explore"],
    votes: 112,
    answers: 18,
    views: "2.1k",
    author: "Nisha Rao",
    initials: "NR",
    time: "Yesterday",
    status: "Answered",
    trending: true,
    color: "cyan",
  },
];

const contributors = [
  { name: "Riya Sharma", initials: "RS", role: "SDE Intern at Adobe", points: "2,480", color: "blue" },
  { name: "Arjun Nair", initials: "AN", role: "Ex-intern at Amazon", points: "1,940", color: "orange" },
  { name: "Sneha Iyer", initials: "SI", role: "Product Intern", points: "1,720", color: "pink" },
  { name: "Dev Patel", initials: "DP", role: "ML Intern at Razorpay", points: "1,460", color: "green" },
];

const quickQuestions = [
  ["How do I ask for a PPO conversation?", "5 answers", "Offer & PPO"],
  ["Should I negotiate my first internship stipend?", "3 answers", "Stipend"],
  ["Resume feedback for an ML internship?", "2 answers", "Resume"],
];

const chips = ["Google", "Remote", "SDE Intern", "Resume review", "PPO"];

const emptyQuestion = {
  title: "",
  description: "",
  category: "",
  company: "",
  tags: "",
  author: "",
};

const categoryColors = {
  "Interview Prep": "violet",
  "Coding Rounds": "cyan",
  "Resume & Portfolio": "orange",
  "Application Process": "pink",
  "Stipend & Pay": "green",
  "Work Culture": "purple",
};

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatFaq(faq) {
  const author = faq.author || "Anonymous";

  return {
    id: faq._id,
    title: faq.title,
    excerpt: faq.description,
    category: faq.category,
    company: faq.company,
    tags: faq.tags ?? [],
    votes: faq.upvoteCount ?? 0,
    answers: faq.answerCount ?? 0,
    views: faq.views ?? 0,
    author,
    initials: getInitials(author),
    time: new Date(faq.createdAt).toLocaleDateString(),
    status: `${faq.status[0].toUpperCase()}${faq.status.slice(1)}`,
    trending: false,
    color: categoryColors[faq.category] ?? "blue",
  };
}

function App() {
  const [activeCategory, setActiveCategory] = useState("All topics");
  const [activeSort, setActiveSort] = useState("Trending");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState([2]);
  const [savedFaqs, setSavedFaqs] = useState([]);
  const [showComposer, setShowComposer] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const [question, setQuestion] = useState(emptyQuestion);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/api/faqs`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load saved FAQs");
        return response.json();
      })
      .then(({ faqs }) => setSavedFaqs(faqs.map(formatFaq)))
      .catch(() => flash("Could not load saved FAQs. Is the API running?"));
  }, []);

  const faqs = useMemo(() => [...savedFaqs, ...demoFaqs], [savedFaqs]);

  const visibleFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const hasCategory = activeCategory === "All topics" || faq.category === activeCategory;
      const value = search.toLowerCase();
      const matchesSearch =
        !value ||
        faq.title.toLowerCase().includes(value) ||
        faq.excerpt.toLowerCase().includes(value) ||
        faq.tags.some((tag) => tag.toLowerCase().includes(value));
      return hasCategory && matchesSearch;
    });
  }, [activeCategory, faqs, search]);

  function flash(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function toggleSaved(id) {
    setSaved((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    );
    flash(saved.includes(id) ? "Removed from saved FAQs" : "Saved for later");
  }

  function updateQuestion(event) {
    const { name, value } = event.target;
    setQuestion((current) => ({ ...current, [name]: value }));
  }

  async function submitQuestion(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/api/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...question,
          author: question.author || "Anonymous",
          tags: question.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Could not save question");

      setSavedFaqs((current) => [formatFaq(result.faq), ...current]);
      setQuestion(emptyQuestion);
      setShowComposer(false);
      flash("Question saved to MongoDB");
    } catch (error) {
      flash(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="nav-inner">
          <a className="brand" href="#">
            <span className="brand-mark"><MessageCircle size={19} strokeWidth={2.7} /></span>
            <span>Crowd<span>FAQ</span></span>
          </a>
          <nav className="main-nav">
            <a className="active" href="#"><House size={17} /> Home</a>
            <a href="#browse"><MessageCircle size={17} /> Browse FAQs</a>
            <a href="#contributors"><Trophy size={17} /> Leaderboard</a>
          </nav>
          <div className="nav-actions">
            <button className="icon-btn notification"><Bell size={19} /><i /></button>
            <button className="ask-button" onClick={() => setShowComposer(true)}>
              <Plus size={17} /> Ask a Question
            </button>
            <button className="profile-btn">
              <span className="avatar avatar-blue">AS</span>
              <span className="profile-copy"><b>Ananya</b><small>320 rep</small></span>
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow"><Sparkles size={15} /> Built by interns, for interns</div>
              <h1>Navigate internships<br /><span>with confidence.</span></h1>
              <p>Real questions. Honest answers. Everything you need to land your next opportunity and make it count.</p>
              <div className="hero-search">
                <Search size={22} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search 2,400+ internship FAQs..."
                />
                <button onClick={() => document.querySelector("#browse").scrollIntoView({ behavior: "smooth" })}>
                  Search
                </button>
              </div>
              <div className="popular">
                <span>Popular:</span>
                {chips.map((chip) => <button key={chip} onClick={() => setSearch(chip)}>{chip}</button>)}
              </div>
            </div>
            <div className="hero-card">
              <div className="hero-card-top">
                <span className="hero-icon"><Lightbulb size={20} /></span>
                <span><b>Today's insight</b><small>From the community</small></span>
                <Sparkles className="sparkle" size={18} />
              </div>
              <p>"Start preparing your stories before your interview. Strong answers need structure, not memorization."</p>
              <div className="insight-footer">
                <span className="avatar avatar-violet">RN</span>
                <span><b>Rohan N.</b><small>Ex-intern at Microsoft</small></span>
                <button><ArrowRight size={17} /></button>
              </div>
            </div>
          </div>
          <div className="stats-bar">
            <div><b>2,400+</b><span><MessageCircle size={16} /> Questions answered</span></div>
            <div><b>8,600+</b><span><Users size={16} /> Interns helping</span></div>
            <div><b>94%</b><span><CheckCircle2 size={16} /> Response rate</span></div>
            <div><b>180+</b><span><Building2 size={16} /> Companies covered</span></div>
          </div>
        </section>

        <section className="content-section" id="browse">
          <div className="section-heading">
            <div>
              <span className="section-label"><Flame size={15} /> Community knowledge</span>
              <h2>Explore internship FAQs</h2>
              <p>Learn from experiences shared by interns and students like you.</p>
            </div>
            <button className="filter-mobile" onClick={() => setMobileFilters(!mobileFilters)}>
              <SlidersHorizontal size={17} /> Filters
            </button>
          </div>

          <div className="workspace">
            <aside className={`categories-panel ${mobileFilters ? "mobile-open" : ""}`}>
              <div className="panel-title"><span>Explore topics</span><SlidersHorizontal size={16} /></div>
              {categories.map(({ name, icon: Icon, count, color }) => (
                <button
                  className={`category-row ${activeCategory === name ? "selected" : ""}`}
                  key={name}
                  onClick={() => {
                    setActiveCategory(name);
                    setMobileFilters(false);
                  }}
                >
                  <span className={`category-icon ${color}`}><Icon size={16} /></span>
                  <span>{name}</span>
                  <small>{count}</small>
                </button>
              ))}
              <div className="career-card">
                <span className="career-icon"><GraduationCap size={19} /></span>
                <b>Internship starter guide</b>
                <p>A curated guide to help you prepare, apply, and thrive.</p>
                <button>Explore guide <ArrowRight size={14} /></button>
              </div>
            </aside>

            <div className="feed-panel">
              <div className="feed-toolbar">
                <div className="sort-tabs">
                  {["Trending", "Latest", "Unanswered"].map((sort) => (
                    <button
                      key={sort}
                      className={activeSort === sort ? "active" : ""}
                      onClick={() => setActiveSort(sort)}
                    >
                      {sort === "Trending" && <Flame size={15} />}
                      {sort}
                    </button>
                  ))}
                </div>
                <span>{visibleFaqs.length} questions</span>
              </div>

              <div className="feed-list">
                {visibleFaqs.map((faq) => (
                  <article className="faq-card" key={faq.id}>
                    <div className="faq-content">
                      <div className="faq-topline">
                        <span className={`topic-badge ${faq.color}`}>{faq.category}</span>
                        {faq.trending && <span className="trending"><TrendingUp size={13} /> Trending</span>}
                        <span className={`status ${faq.status.toLowerCase()}`}>
                          <i />{faq.status}
                        </span>
                      </div>
                      <h3>{faq.title}</h3>
                      <p>{faq.excerpt}</p>
                      <div className="tag-row">
                        {faq.tags.map((tag) => <button key={tag}>#{tag}</button>)}
                      </div>
                      <div className="faq-footer">
                        <div className="author">
                          <span className={`avatar avatar-${faq.color}`}>{faq.initials}</span>
                          <span><b>{faq.author}</b><small>asked {faq.time}</small></span>
                        </div>
                        <div className="faq-metrics">
                          <span className="vote"><TrendingUp size={15} /> {faq.votes}</span>
                          <span><MessageCircle size={15} /> {faq.answers}</span>
                          <span><Eye size={15} /> {faq.views}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      aria-label="Save FAQ"
                      className={`save-button ${saved.includes(faq.id) ? "saved" : ""}`}
                      onClick={() => toggleSaved(faq.id)}
                    >
                      {saved.includes(faq.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    </button>
                  </article>
                ))}
                {!visibleFaqs.length && (
                  <div className="empty-state">
                    <Search size={30} />
                    <h3>No matching FAQs yet</h3>
                    <p>Try another search or be the first to ask the community.</p>
                    <button className="ask-button" onClick={() => setShowComposer(true)}><Plus size={17} /> Ask a Question</button>
                  </div>
                )}
              </div>
              {!!visibleFaqs.length && <button className="load-more">Load more questions <ChevronDown size={16} /></button>}
            </div>

            <aside className="right-panel">
              <div className="side-card" id="contributors">
                <div className="side-card-title">
                  <span><Trophy size={17} /> Top contributors</span>
                  <button>View all</button>
                </div>
                <div className="contributors">
                  {contributors.map((person, index) => (
                    <div className="contributor" key={person.name}>
                      <span className="rank">{index + 1}</span>
                      <span className={`avatar avatar-${person.color}`}>{person.initials}</span>
                      <span className="person-copy"><b>{person.name}</b><small>{person.role}</small></span>
                      <span className="points"><Trophy size={12} />{person.points}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="side-card unanswered">
                <div className="side-card-title">
                  <span><Clock3 size={17} /> Needs your input</span>
                </div>
                {quickQuestions.map(([question, answers, tag]) => (
                  <button className="quick-question" key={question}>
                    <b>{question}</b>
                    <span><small>{tag}</small><em>{answers}</em></span>
                  </button>
                ))}
                <button className="text-link">See unanswered questions <ArrowRight size={14} /></button>
              </div>
            </aside>
          </div>
        </section>

        <section className="cta-section">
          <div>
            <span className="section-label"><Bot size={15} /> Knowledge grows when shared</span>
            <h2>Have a question? Your answer<br />might help someone too.</h2>
          </div>
          <button className="cta-button" onClick={() => setShowComposer(true)}>
            <Plus size={18} /> Ask the community
          </button>
        </section>
      </main>

      <footer>
        <a className="brand" href="#"><span className="brand-mark"><MessageCircle size={17} /></span>Crowd<span>FAQ</span></a>
        <p>Built for ambitious interns, powered by shared experiences.</p>
        <span>&copy; 2026 CrowdFAQ</span>
      </footer>

      {showComposer && (
        <div className="modal-backdrop" onMouseDown={() => setShowComposer(false)}>
          <form className="composer" onSubmit={submitQuestion} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="close-button" onClick={() => setShowComposer(false)}><X size={19} /></button>
            <span className="composer-icon"><MessageCircle size={22} /></span>
            <h2>Ask the community</h2>
            <p>Share enough context to help other interns give you a useful answer.</p>
            <label>Question title<input required minLength="10" name="title" value={question.title} onChange={updateQuestion} placeholder="e.g. How should I prepare for an SDE interview?" /></label>
            <label>Details<textarea required minLength="20" name="description" value={question.description} onChange={updateQuestion} placeholder="Add context so the community can give you a useful answer." /></label>
            <label>Topic
              <select required name="category" value={question.category} onChange={updateQuestion}>
                <option value="" disabled>Select a category</option>
                {categories.slice(1).map(({ name }) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label>Company<input name="company" value={question.company} onChange={updateQuestion} placeholder="Optional" /></label>
            <label>Tags<input name="tags" value={question.tags} onChange={updateQuestion} placeholder="e.g. DSA, Remote, Interview" /></label>
            <label>Your name<input name="author" value={question.author} onChange={updateQuestion} placeholder="Anonymous" /></label>
            <div className="composer-actions">
              <button type="button" className="cancel" onClick={() => setShowComposer(false)}>Cancel</button>
              <button type="submit" className="ask-button" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Post question"} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

export default App;
