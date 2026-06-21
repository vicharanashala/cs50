import React from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="empty-state">
      <Search size={30} />
      <h3>No results found</h3>
      <p>Try another filter or ask the question yourself.</p>
      <Link className="ask-button" to="/faqs/ask"><Plus size={16} /> Ask a question</Link>
    </div>
  );
}

