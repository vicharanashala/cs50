import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

export default function Brand({ compact = false }) {
  return (
    <Link className={`brand ${compact ? "brand-compact" : ""}`} to="/">
      <span className="brand-mark"><MessageCircle size={compact ? 17 : 19} /></span>
      <span className="brand-name">Crowd<span>FAQ</span></span>
    </Link>
  );
}

