# cs50
<div align="center">

<!-- ANIMATED HEADER BANNER — BLUE THEME -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a1628,40:1e3a5f,100:2563eb&height=220&section=header&text=CrowdFAQ&fontSize=90&fontColor=ffffff&animation=twinkling&fontAlignY=38&desc=Where%20Questions%20Meet%20Intelligence&descAlignY=58&descSize=20&descColor=93c5fd" width="100%"/>

<!-- TYPING SVG — BLUE ACCENT -->
[![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=22&duration=3500&pause=900&color=3B82F6&center=true&vCenter=true&repeat=true&width=620&lines=AI-Powered+Student+FAQ+Platform;Crowd-Sourced+Knowledge+Base;React+%2B+Express+%2B+MongoDB+%2B+Gemini;CS50x+Final+Project+2026)](https://github.com/aavesh-k/cs50)

<br/>

<!-- STATUS BADGES -->
<p>
  <img src="https://img.shields.io/badge/CS50x-Final%20Project-1d4ed8?style=for-the-badge&logo=harvard&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-MIT-2563eb?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Status-Active-3b82f6?style=for-the-badge&logo=checkmarx&logoColor=white"/>
  <img src="https://img.shields.io/badge/Year-2026-60a5fa?style=for-the-badge"/>
</p>

<!-- TECH BADGES -->
<p>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Vite-6.4-646CFF?style=flat-square&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express.js-4.22-000000?style=flat-square&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white"/>
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white"/>
  <img src="https://img.shields.io/badge/zod-Validation-3068B7?style=flat-square&logo=zod&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vitest-Testing-6E9F18?style=flat-square&logo=vitest&logoColor=white"/>
</p>

</div>

---

## 🧠 What is CrowdFAQ?

<table>
<tr>
<td width="58%">

> **CrowdFAQ** is a full-stack community-driven FAQ platform built as a **CS50x Final Project**. Students ask questions, the community answers, and an **AI assistant powered by Google Gemini** enriches responses with intelligent summaries — creating a self-improving knowledge base for academic and professional growth.

Think of it as **Stack Overflow meets Reddit**, tailored for students.

</td>
<td width="42%" align="center">

```
🧑 Student asks a question
        ↓
💬 Community answers
        ↓
🔐 Admin verifies best answer
        ↓
🤖 Gemini generates AI summary
        ↓
🏅 Badges & reputation earned
        ↓
📚 Knowledge base grows
```

</td>
</tr>
</table>

---

## ✨ Features

<details>
<summary><b>🏠 Landing & Discovery</b></summary>
<br/>

- Dynamic landing page with **real-time database statistics**
- **Animated floating gradient orbs** on the landing page
- **Trending FAQ categories** with live question counts
- Category shortcuts from the landing page to filtered FAQs

</details>

<details>
<summary><b>🎨 UI / UX</b></summary>
<br/>

- Fixed responsive header with **FAQ search** + **search highlighting**
- **Dark mode and light mode** support
- **Infinite scroll** on FAQ feed (IntersectionObserver)
- Heart-shaped upvote buttons on answers and comments
- **Sticky footer** layout across all pages
- Fully **mobile-responsive layout**

</details>

<details>
<summary><b>🔐 Authentication & Profiles</b></summary>
<br/>

- **Student registration and login** with JWT authentication
- **Admin login** and protected moderation dashboard
- **Password reset** via email (forgot/reset flow)
- **Email verification** on registration
- **Brute-force protection** — lockout after 5 failed attempts
- User profiles with **bio, reputation, branch, and semester**
- **Saved FAQ bookmarks** and **Followed FAQs** on profile
- **Follow and unfollow** student profiles
- Private follower and following lists

</details>

<details>
<summary><b>📋 FAQ Management</b></summary>
<br/>

- FAQ creation with **categories, tags, company, role, branch, and semester**
- **Anonymous FAQ posting** support
- **Similar-question suggestions** before posting
- **Tag autocomplete** with usage-based sorting
- Search FAQs by title, description, or tags
- Filter FAQs by category, company, role, and status
- Sort by latest, most answered, most upvoted, or unanswered
- Full FAQ detail page with **views, tags, and AI summary**
- FAQ **upvotes, downvotes, bookmarks, follows, shares, and reports**
- **Edit history** for all FAQs (append-only log)
- **Question merge** for duplicate FAQs
- **Feature/pin** important FAQs

</details>

<details>
<summary><b>💬 Answers & Interactions</b></summary>
<br/>

- Answers with **anonymous posting** support
- Answer **upvotes, downvotes, comments, mentions, and reports**
- **Comment likes** (heart toggle)
- **Edit history** for all answers
- Users **cannot answer or comment** on their own FAQs
- FAQ owners can **accept admin-verified best answers**
- Reputation changes on accept (+25 / -25)
- Users can delete their own **unverified** answers
- Verified answer deletion requires **admin action**

</details>

<details>
<summary><b>🏅 Gamification</b></summary>
<br/>

- **Reputation ladder:** 10→comment, 25→upvote, 50→downvote, 100→flag
- **Leaderboard** — top 50 contributors by reputation
- **Badge system** with 8 badges (auto-awarded on login/question/answer)
  - First Steps, Curious Mind, Helping Hand, Top Contributor
  - Rising Star, Expert, Popular Answer, Frequently Bookmarked
- **Trending questions** weighted by votes + recency

</details>

<details>
<summary><b>🤖 AI Features (Google Gemini)</b></summary>
<br/>

- **Automatic AI summaries** generated from verified answers
- AI summaries **refresh** after verification, unverification, or deletion
- **AI chatbot** grounded in verified community answers
- **Floating chatbot helper** with personalized greeting

</details>

<details>
<summary><b>🔔 Notifications</b></summary>
<br/>

- Notifications for **answers, mentions, accepted answers, FAQ activity, and followers**
- **Duplicate prevention** — unique index on (recipient, type, faq, answer)
- Optional email notifications via SMTP
- Unread count badge on navbar

</details>

<details>
<summary><b>🛡️ Moderator & Admin</b></summary>
<br/>

- **Moderator role** — close/reopen FAQs, edit any FAQ, review reports queue
- **Admin dashboard** with stats, user/FAQ/answer/report management
- Admin **user banning, unbanning, and deletion** (with content cleanup)
- Admin **answer verification, unverification, and convert-to-comment**
- Admin **FAQ pinning, closing, reopening, merging, and deletion**
- Report review, dismissal, escalate, and content removal
- **Edit history** browsing for all content

</details>

<details>
<summary><b>🛡️ Security</b></summary>
<br/>

- **Helmet** — HTTP security headers
- **express-rate-limit** — rate limiting per endpoint
- **express-mongo-sanitize** — NoSQL injection prevention
- **zod** — request body validation on all POST/PATCH routes
- **Input sanitization** — strips XSS, javascript: URLs, on-event handlers
- **Brute-force protection** — temporary 15-min lockout after 5 failures
- **CSP headers** configured via Helmet

</details>

---

## 🛠️ Tech Stack

<div align="center">

### 🎨 Frontend
<p>
  <img src="https://skillicons.dev/icons?i=react,vite,css,html" />
</p>

### ⚙️ Backend
<p>
  <img src="https://skillicons.dev/icons?i=nodejs,express,mongodb" />
</p>

### 🔧 Tools
<p>
  <img src="https://skillicons.dev/icons?i=git,github,vscode" />
</p>

</div>

```
Frontend  →  React 18 + Vite 6 + React Router DOM v7 + Lucide Icons
Backend   →  Node.js + Express 4 + MongoDB (Mongoose) + JWT + bcryptjs
AI        →  Google Gemini 2.5 Flash
Validation → zod
Testing   →  Vitest + mongodb-memory-server
Dev DX    →  Concurrently + Vite HMR + node --watch
```

---

## 🚀 Quick Start

### Prerequisites

```
node >= 18.x
npm  >= 9.x
MongoDB Atlas account (or local MongoDB instance)
Google Gemini API key
```

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/aavesh-k/cs50.git
cd cs50
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values — refer to `.env.example` for all required fields. Keep your credentials **private and never commit `.env` to version control**.

### 4️⃣ Launch the App

```bash
# Starts both API server and frontend simultaneously
npm run dev:all
```

| Service | URL |
|---|---|
| 🌐 Frontend | `http://127.0.0.1:5174` |
| 🔌 API Server | `http://localhost:3000` |

> **Tip:** You can also run them separately using `npm run dev` (frontend) and `npm run dev:server` (backend).

### 5️⃣ Run Tests

```bash
npm test
```

---

## 📁 Project Structure

```
cs50/
├── server/                # Express.js API server
│   ├── config/            # DB connection, env vars
│   ├── models/            # Mongoose schemas (10 models)
│   ├── routes/            # API route handlers
│   ├── middleware/        # Auth, rate-limit, validator, brute-force
│   ├── services/          # Email, AI, notifications, badges, reputation
│   └── utils/             # Helpers, response wrapper
│
├── src/                   # React frontend (Vite)
│   ├── pages/             # Route-level page components
│   ├── features/          # Feature-specific (faq, answer, auth, admin)
│   ├── components/        # Reusable UI (layout, common, ui)
│   ├── hooks/             # Custom hooks (useToast, useDebounced)
│   └── utils/             # Helpers (time, string, constants, highlight)
│
├── tests/                 # Vitest test suites
├── index.html
├── package.json
├── .env.example
├── .gitignore
└── LICENSE
```

---

## 🤝 Contributing

All contributions are welcome!

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/YourFeature

# 3. Commit your changes
git commit -m "Add: YourFeature"

# 4. Push to the branch
git push origin feature/YourFeature

# 5. Open a Pull Request
```

---

## 📜 License

Distributed under the **MIT License** — see [`LICENSE`](./LICENSE) for details.

---

<div align="center">

<!-- BOTTOM WAVE -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2563eb,60:1e3a5f,100:0a1628&height=130&section=footer" width="100%"/>

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=16&duration=3000&pause=1500&color=60A5FA&center=true&vCenter=true&width=500&lines=Built+with+%E2%9D%A4%EF%B8%8F+for+CS50x+%C2%B7+2026;Vicharanashala+Lab+Intern+2026)](https://github.com/aavesh-k/cs50)

<br/>

<sub><b>This was CS50x — and this is CrowdFAQ.</b></sub>

</div>
