import React from "react";
import Brand from "./Brand.jsx";
import Navbar from "./Navbar.jsx";
import Chatbot from "./Chatbot.jsx";

export default function Shell({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="shell-content">{children}</main>
      <footer><Brand compact /><p>Built for ambitious interns, powered by shared experiences.</p><span>&copy; 2026 CrowdFAQ</span></footer>
      <Chatbot />
    </div>
  );
}

