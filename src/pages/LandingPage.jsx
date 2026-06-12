import React from "react";
import { useEffect, useState } from "react";
import { ArrowRight, Plus, Search, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../hooks/useToast.jsx";
import { api } from "../api.js";
import { queryString } from "../utils/string.js";
import Shell from "../components/layout/Shell.jsx";

export default function LandingPage() {
  const toast = useToast();
  const [landingData, setLandingData] = useState(null);
  useEffect(() => {
    api("/landing-stats").then(setLandingData).catch((error) => toast(error.message, "error"));
  }, []);
  const stats = landingData ? [
    [landingData.stats.questionsAsked.toLocaleString(), "Questions Asked"],
    [landingData.stats.internsHelped.toLocaleString(), "Interns Helped"],
    [landingData.stats.companiesCovered.toLocaleString(), "Companies Covered"],
    [`${landingData.stats.answeredRate}%`, "Answered Rate"],
  ] : [["--", "Questions Asked"], ["--", "Interns Helped"], ["--", "Companies Covered"], ["--", "Answered Rate"]];
  return (
    <Shell>
      <main className="landing-page">
        <section className="landing-hero">
          <span className="landing-orb orb-indigo" />
          <span className="landing-orb orb-violet" />
          <span className="landing-orb orb-cyan" />
          <div className="landing-copy">
            <span className="section-label"><Sparkles size={14} /> Built by interns, for interns</span>
            <h1>Find answers. <span>Share experience.</span></h1>
            <p>Real internship questions and practical answers from students who have been there.</p>
            <div className="landing-buttons">
              <Link className="cta-button" to="/faqs"><Search size={16} /> Browse FAQs</Link>
              <Link className="outline-button" to="/faqs/ask"><Plus size={16} /> Ask a Question</Link>
            </div>
          </div>
          <aside className="hero-community-card">
            <div className="hero-community-stats">
              {stats.map(([value, label]) => <div className="hero-community-stat" key={label}><b>{value}</b><span>{label}</span></div>)}
            </div>
            <div className="hero-trending">
              <small><TrendingUp size={13} /> Trending Right Now</small>
              <div className="hero-topic-list">
                {landingData?.trendingTopics.map((topic, index) => (
                  <Link className={`hero-topic topic-${index + 1}`} key={topic.category} to={`/faqs?${queryString({ category: topic.category })}`}>
                    {topic.category}<span>{topic.count}</span>
                  </Link>
                ))}
                {landingData && !landingData.trendingTopics.length && <em>No topics yet</em>}
              </div>
            </div>
          </aside>
        </section>
        <section className="landing-guide">
          <div>
            <span className="section-label"><Sparkles size={14} /> Community-powered guidance</span>
            <h2>Start with shared experience.</h2>
            <p>Browse practical answers from interns or ask the community when your question is new.</p>
          </div>
          <div className="landing-action-grid">
            <Link className="landing-action featured" to="/faqs/ask">
              <Plus size={19} /><h3>Ask a Question</h3><p>Got a doubt? The community has your back.</p><span>Post now <ArrowRight size={14} /></span>
            </Link>
            <Link className="landing-action" to="/faqs">
              <Search size={19} /><h3>Browse FAQs</h3><p>Explore answers shared by students with real experience.</p><span>Explore FAQs <ArrowRight size={14} /></span>
            </Link>
          </div>
        </section>
      </main>
    </Shell>
  );
}

