import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Medal, TrendingUp } from "lucide-react";
import { useToast } from "../hooks/useToast.jsx";
import { api } from "../api.js";
import { initials } from "../utils/string.js";
import Shell from "../components/layout/Shell.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

const rankIcons = [Trophy, Medal, Medal];
const rankColors = ["gold", "silver", "bronze"];

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api("/leaderboard")
      .then((data) => setUsers(data.users))
      .catch((error) => toast(error.message, "error"))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Shell><PageLoader /></Shell>;
  return (
    <Shell>
      <main className="page-content" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div className="page-title">
          <span className="section-label"><Trophy size={14} /> Community leaders</span>
          <h1>Leaderboard</h1>
          <p>Top contributors ranked by reputation.</p>
        </div>
        <div className="surface" style={{ overflow: "hidden" }}>
          {users.map((user, index) => {
            const RankIcon = rankIcons[index];
            return (
              <Link to={`/profile/${user._id}`} className="leaderboard-row" key={user._id}>
                <span className="leaderboard-rank">
                  {RankIcon ? <RankIcon size={18} className={`rank-${rankColors[index]}`} /> : <b>#{index + 1}</b>}
                </span>
                <span className="avatar avatar-blue">{initials(user.name)}</span>
                <span className="leaderboard-info">
                  <b>{user.name}</b>
                  <small>{user.branch || "No branch"}{user.semester ? ` · Sem ${user.semester}` : ""}</small>
                </span>
                <span className="leaderboard-stats">
                  <span><TrendingUp size={14} /> {user.reputation} rep</span>
                  <small>{user.questionsAsked} questions · {user.answersGiven} answers · {user.acceptedAnswers} accepted</small>
                </span>
              </Link>
            );
          })}
          {!users.length && <p style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>No contributors yet.</p>}
        </div>
      </main>
    </Shell>
  );
}
