"use client";

/**
 * Light/dark toggle. The no-flash script in layout.tsx sets
 * document.documentElement.dataset.theme before paint; this button just
 * flips it and persists the choice. Both icons are always rendered — CSS
 * shows the right one per theme — so the server and client markup are
 * identical and hydration never mismatches.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode / blocked storage: the toggle still works for this page view.
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {/* moon — shown in light mode ("switch to dark") */}
      <svg
        className="tt-moon"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16.5 11.5a6.5 6.5 0 1 1-8-8 5.5 5.5 0 0 0 8 8Z" />
      </svg>
      {/* sun — shown in dark mode ("switch to light") */}
      <svg
        className="tt-sun"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="4" />
        <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M16 4l-1.4 1.4M5.4 14.6 4 16M16 16l-1.4-1.4M5.4 5.4 4 4" />
      </svg>
    </button>
  );
}
