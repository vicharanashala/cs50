import React from "react";
import { useEffect, useRef, useState } from "react";
import { Filter, MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../hooks/useToast.jsx";
import { useDebounced } from "../hooks/useDebounced.js";
import { api } from "../api.js";
import { categoriesFromParams, queryString } from "../utils/string.js";
import { categories } from "../utils/constants.js";
import Shell from "../components/layout/Shell.jsx";
import FilterSection from "../components/ui/FilterSection.jsx";
import FaqSkeletons from "../components/ui/FaqSkeletons.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import FaqCard from "../features/faq/FaqCard.jsx";

export default function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [faqs, setFaqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ categories: categoriesFromParams(searchParams), company: "", role: "", status: "all", sort: "latest" });
  const latestRequest = useRef(0);
  const debouncedSearch = useDebounced(search, 400);
  const debouncedCompany = useDebounced(filters.company, 400);
  const debouncedRole = useDebounced(filters.role, 400);
  const toast = useToast();
  const urlSearch = searchParams.get("search") ?? "";
  const urlCategory = searchParams.get("category") ?? "";
  const sentinelRef = useRef();
  const fetchRef = useRef();
  fetchRef.current = fetchFaqs;
  const filterKey = JSON.stringify({ search: debouncedSearch, company: debouncedCompany, role: debouncedRole, categories: filters.categories, status: filters.status, sort: filters.sort });
  async function fetchFaqs(nextPage = 1, append = false) {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const params = queryString({ search: debouncedSearch, company: debouncedCompany, role: debouncedRole, category: filters.categories.join(","), status: filters.status, sort: filters.sort, page: nextPage, limit: 10 });
      const data = await api(`/faqs?${params}`);
      if (requestId !== latestRequest.current) return;
      setFaqs((current) => append ? [...current, ...data.faqs] : data.faqs);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      toast(error.message, "error");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }
  useEffect(() => { fetchFaqs(); }, [filterKey]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchRef.current(page + 1, true);
    }, { threshold: 0.1 });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page]);
  useEffect(() => {
    setSearch(urlSearch);
    setFilters((current) => ({ ...current, categories: categoriesFromParams(searchParams), company: "", role: "", status: "all" }));
  }, [urlSearch, urlCategory]);
  function toggleCategory(category) {
    setFilters((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((item) => item !== category) : [...current.categories, category] }));
  }
  function clearFilters() {
    setSearch("");
    setSearchParams({});
    setFilters({ categories: [], company: "", role: "", status: "all", sort: "latest" });
  }
  return (
    <Shell>
      <main className="page-content">
        <div className="page-title">
          <span className="section-label"><MessageSquare size={14} /> Community knowledge</span>
          <h1>Internship FAQs</h1>
          <p>Real questions and answers from students who have been through the internship process.</p>
        </div>
        <div className="feed-layout">
          <aside className={`filter-panel ${filtersOpen ? "mobile-open" : ""}`}>
            <div className="panel-title"><span>Filters</span><button onClick={clearFilters}>Clear all</button></div>
            <FilterSection title="Category">{categories.map((category) => (
              <label className="check-label" key={category}>
                <input type="checkbox" checked={filters.categories.includes(category)} onChange={() => toggleCategory(category)} />{category}
              </label>
            ))}</FilterSection>
            <FilterSection title="Company"><input value={filters.company} onChange={(event) => setFilters({ ...filters, company: event.target.value })} placeholder="e.g. Google" /></FilterSection>
            <FilterSection title="Role"><input value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} placeholder="e.g. SDE Intern" /></FilterSection>
            <FilterSection title="Status">{["all", "open", "answered", "closed"].map((status) => (
              <label className="check-label" key={status}>
                <input type="radio" name="status" checked={filters.status === status} onChange={() => setFilters({ ...filters, status })} />
                {status[0].toUpperCase() + status.slice(1)}
              </label>
            ))}</FilterSection>
          </aside>
          <section className="feed-panel">
            <button className="filter-mobile" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={16} /> Filters</button>
            <div className="feed-toolbar">
              <div className="sort-tabs">
                {[["latest", "Latest"], ["answered", "Most Answered"], ["upvoted", "Most Upvoted"], ["unanswered", "Unanswered"]].map(([value, label]) => (
                  <button key={value} className={filters.sort === value ? "active" : ""} onClick={() => setFilters({ ...filters, sort: value })}>{label}</button>
                ))}
              </div>
              <span>Showing {faqs.length} of {total} results</span>
            </div>
            <div className="feed-list">
              {faqs.map((faq) => <FaqCard key={faq._id} faq={faq} search={debouncedSearch} onChange={(changed) => setFaqs((items) => items.map((item) => item._id === changed._id ? changed : item))} />)}
              {!loading && !faqs.length && <EmptyState />}
              {loading && !faqs.length && <FaqSkeletons />}
              {loading && faqs.length > 0 && <FaqSkeletons />}
            </div>
            <div ref={sentinelRef} style={{ height: 1 }} />
            {hasMore && <div style={{ textAlign: "center", padding: "16px", color: "var(--muted)", fontSize: "13px" }}>Scroll for more...</div>}
          </section>
        </div>
      </main>
    </Shell>
  );
}

