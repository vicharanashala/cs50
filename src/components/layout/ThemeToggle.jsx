import React from "react";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem("crowdfaq_theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("crowdfaq_theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button className="icon-btn" title={dark ? "Use light mode" : "Use dark mode"} onClick={() => setDark(!dark)}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

