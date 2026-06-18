import React from "react";
import { useEffect, useState } from "react";
import { Pencil, UserCheck, UserPlus, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useToast } from "../hooks/useToast.jsx";
import { api, patch, post } from "../api.js";
import { initials } from "../utils/string.js";
import { relativeTime } from "../utils/time.js";
import { branches } from "../utils/constants.js";
import Shell from "../components/layout/Shell.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";
import Field from "../components/ui/Field.jsx";
import Stat from "../components/common/Stat.jsx";
import PrivateNetworkList from "../components/common/PrivateNetworkList.jsx";
import ProfileList from "../components/common/ProfileList.jsx";

export default function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const profileId = id ?? auth.user?._id;
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState([]);
  const [followed, setFollowed] = useState([]);
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
      const [savedFaqs, followedFaqs, follows] = await Promise.all([
        api(`/users/${profileId}/saved-faqs`),
        api(`/users/${profileId}/followed-faqs`),
        api(`/users/${profileId}/follows`),
      ]);
      setSaved(savedFaqs.faqs);
      setFollowed(followedFaqs.faqs);
      setNetwork(follows);
      auth.updateUser({ ...auth.user, ...profile.user });
    }
  }

  useEffect(() => { load().catch((error) => toast(error.message, "error")); }, [profileId]);

  async function save(event) {
    event.preventDefault();
    try {
      const isAdminRole = data?.user?.role !== "student";
      const payload = isAdminRole
        ? { name: form.name, bio: form.bio || null }
        : { name: form.name, branch: form.branch || null, semester: form.semester || null, bio: form.bio || null };
      const { user: updated } = await patch(`/users/${profileId}`, payload);
      auth.updateUser(updated);
      setData({ ...data, user: updated });
      setEditing(false);
      toast("Profile updated", "success");
    } catch (error) { toast(error.message, "error"); }
  }

  async function toggleProfileFollow() {
    if (!auth.user) return navigate("/login", { state: { from: `/profile/${profileId}`, message: "Please login to continue" } });
    try {
      const result = await post(`/users/${profileId}/follow`, {});
      setData((current) => ({ ...current, followedByViewer: result.followed, followerCount: result.followerCount }));
      auth.updateUser({ ...auth.user, followingCount: result.viewerFollowingCount });
      toast(result.followed ? "Following this student" : "Student unfollowed", "info");
    } catch (error) { toast(error.message, "error"); }
  }

  if (!data) return <Shell><PageLoader /></Shell>;
  const { user, faqs, answers, followerCount, followingCount, followedByViewer } = data;
  const isAdmin = user.role !== "student";
  const roleLabel = user.role === "admin" ? "Administrator" : user.role === "moderator" ? "Moderator" : null;

  return (
    <Shell>
      <main className="profile-page">

        {/* Profile header */}
        <section className="surface profile-header">
          <span className="avatar avatar-blue large">{initials(user.name)}</span>
          <div>
            <h1>{user.name}</h1>
            {isAdmin
              ? <p style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--primary)" }}>
                  <ShieldCheck size={15} /> {roleLabel}
                </p>
              : <p>{user.branch || "Branch not set"} {user.semester && `- Semester ${user.semester}`}</p>
            }
            {!isAdmin && <b>{user.reputation} reputation</b>}
            {user.bio && <p className="profile-bio">{user.bio}</p>}
          </div>
          {own
            ? <button className="outline-button" onClick={() => setEditing(!editing)}><Pencil size={15} /> Edit profile</button>
            : !isAdmin && !auth.isAdmin && (
                <button className={`outline-button ${followedByViewer ? "active" : ""}`} onClick={toggleProfileFollow}>
                  {followedByViewer ? <UserCheck size={15} /> : <UserPlus size={15} />}
                  {followedByViewer ? "Following" : "Follow student"}
                </button>
              )
          }
        </section>

        {/* Student-only stats */}
        {!isAdmin && (
          <section className="stats-grid">
            <Stat label="Questions asked" value={user.questionsAsked} />
            <Stat label="Answers given" value={user.answersGiven} />
            <Stat label="Accepted answers" value={user.acceptedAnswers} />
            <Stat label="Reputation" value={user.reputation} />
            <Stat label="Followers" value={followerCount} active={networkTab === "followers"} onClick={own ? () => setNetworkTab(networkTab === "followers" ? null : "followers") : undefined} />
            <Stat label="Following" value={own ? (auth.user?.followingCount ?? followingCount) : followingCount} active={networkTab === "following"} onClick={own ? () => setNetworkTab(networkTab === "following" ? null : "following") : undefined} />
          </section>
        )}

        {/* Edit form */}
        {editing && (
          <form className="surface form-grid profile-edit" onSubmit={save}>
            <h2>Edit profile</h2>
            <Field label="Name" required>
              <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            {!isAdmin && (
              <div className="form-row">
                <Field label="Branch (optional)">
                  <select value={form.branch ?? ""} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                    <option value="">Select</option>
                    {branches.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Semester (optional)">
                  <select value={form.semester ?? ""} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            )}
            <Field label={`Bio (optional - ${form.bio?.length ?? 0}/200)`}>
              <textarea maxLength="200" value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>
            <button className="primary-button">Save profile</button>
          </form>
        )}

        {/* Student-only content */}
        {!isAdmin && (
          <>
            <ProfileList title="Recent questions" empty="No questions posted yet.">
              {faqs.map((faq) => <Link key={faq._id} to={`/faqs/${faq._id}`}>{faq.title}<small>{faq.category} - {relativeTime(faq.createdAt)}</small></Link>)}
            </ProfileList>
            <ProfileList title="Recent answers" empty="No answers posted yet.">
              {answers.map((answer) => <Link key={answer._id} to={`/faqs/${answer.faq?._id}`}>{answer.faq?.title}<small>{answer.body.slice(0, 100)}</small></Link>)}
            </ProfileList>
            {own && (
              <ProfileList title="Saved FAQs" empty="No bookmarks yet.">
                {saved.map((faq) => <Link key={faq._id} to={`/faqs/${faq._id}`}>{faq.title}<small>{faq.category}</small></Link>)}
              </ProfileList>
            )}
            {own && (
              <ProfileList title="Followed FAQs" empty="Not following any FAQs yet.">
                {followed.map((faq) => <Link key={faq._id} to={`/faqs/${faq._id}`}>{faq.title}<small>{faq.category}</small></Link>)}
              </ProfileList>
            )}
            {own && networkTab && (
              <section className="surface network-panel">
                <PrivateNetworkList title={networkTab === "followers" ? "Your followers" : "You follow"} users={network[networkTab]} />
              </section>
            )}
          </>
        )}

      </main>
    </Shell>
  );
}
