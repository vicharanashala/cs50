import React from "react";
import { useState } from "react";
import { House, LogIn, LogOut, Menu, Plus, Shield, Trophy, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { initials } from "../../utils/string.js";
import Brand from "./Brand.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import HeaderSearch from "./HeaderSearch.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  function logout() {
    auth.logout();
    toast("See you soon!", "info");
    navigate("/login");
  }
  function closeMenu() {
    setMenuOpen(false);
  }
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Brand />
        <button className="hamburger icon-btn" title={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`main-nav${menuOpen ? " open" : ""}`}>
          <Link to="/faqs" onClick={closeMenu}><House size={17} /> FAQs</Link>
          <Link to="/leaderboard" onClick={closeMenu}><Trophy size={17} /> Leaderboard</Link>
          {auth.user && <Link to="/profile" onClick={closeMenu}><User size={17} /> Profile</Link>}
          {auth.isAdmin && <Link to="/admin" onClick={closeMenu}><Shield size={17} /> Admin</Link>}
        </nav>
        <HeaderSearch />
        <div className="nav-actions">
          <ThemeToggle />
          {auth.user ? (
            <>
              <NotificationBell />
              <Link className="ask-button" to="/faqs/ask"><Plus size={17} /><span>Ask a Question</span></Link>
              <Link className="profile-btn" to="/profile" onClick={closeMenu}>
                <span className="avatar avatar-blue">{initials(auth.user.name)}</span>
                <span className="profile-copy"><b>{auth.user.name}</b><small>{auth.user.reputation} rep</small></span>
              </Link>
              <button className="icon-btn" title="Logout" onClick={logout}><LogOut size={18} /></button>
            </>
          ) : (
            <>
              <Link className="ask-button" to="/faqs/ask"><Plus size={17} /><span>Ask a Question</span></Link>
              <Link className="outline-button" to="/login" onClick={closeMenu}><LogIn size={16} /> Login</Link>
            </>
          )}
        </div>
        {menuOpen && <div className="nav-overlay" onClick={closeMenu} />}
      </div>
    </header>
  );
}

