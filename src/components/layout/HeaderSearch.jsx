import React from "react";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { queryString } from "../../utils/string.js";

export default function HeaderSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get("search") ?? "");
  useEffect(() => {
    if (location.pathname === "/faqs") setSearch(new URLSearchParams(location.search).get("search") ?? "");
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (location.pathname !== "/faqs") return;
    const value = search.trim();
    navigate(value ? `/faqs?${queryString({ search: value })}` : "/faqs", { replace: true });
  }, [search]);
  function clear() {
    setSearch("");
    if (location.pathname === "/faqs") navigate("/faqs");
  }
  return (
    <form className="nav-search" role="search" onSubmit={(event) => event.preventDefault()}>
      <Search size={16} />
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, description, or tags..." aria-label="Search FAQs" />
      {search && <button type="button" aria-label="Clear search" onClick={clear}><X size={14} /></button>}
    </form>
  );
}

