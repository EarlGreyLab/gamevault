import { useState, useEffect } from 'react';
import { Sun, Moon, Settings } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gamevault-theme';

export const Component = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const activeClass = 'bg-black/15 dark:bg-white/15';

  return (
    <div
      className="
        inline-flex rounded-lg overflow-hidden relative
        bg-white/20 dark:bg-black/40
        backdrop-blur-md
        shadow-lg shadow-black/20
        border border-gray-300 dark:border-black/60
        transition-colors duration-500
      "
    >
      <button
        onClick={() => setTheme('light')}
        className={`
          px-4 py-2 rounded-l-lg
          flex items-center gap-2
          text-black dark:text-white
          hover:bg-black/10 dark:hover:bg-white/10
          transition-colors duration-300
          focus:outline-none focus:ring-0
          border-r border-gray-300 dark:border-black/60
          group
          ${theme === 'light' ? activeClass : 'bg-transparent'}
        `}
        aria-label="Toggle Light Mode"
        aria-pressed={theme === 'light'}
      >
        <Sun
          className="
            w-5 h-5
            text-current
            transition-transform duration-300
            group-hover:scale-110
          "
          aria-hidden="true"
        />
        <span className="select-none">Light</span>
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`
          px-4 py-2
          flex items-center gap-2
          text-black dark:text-white
          hover:bg-black/10 dark:hover:bg-white/10
          transition-colors duration-300
          focus:outline-none focus:ring-0
          border-r border-gray-300 dark:border-black/60
          group
          ${theme === 'dark' ? activeClass : 'bg-transparent'}
        `}
        aria-label="Toggle Dark Mode"
        aria-pressed={theme === 'dark'}
      >
        <Moon
          className="
            w-5 h-5
            text-current
            transition-transform duration-300
            group-hover:scale-110
          "
          aria-hidden="true"
        />
        <span className="select-none">Dark</span>
      </button>

      <button
        onClick={() => setSettingsOpen(v => !v)}
        className={`
          px-4 py-2 rounded-r-lg
          flex items-center gap-2
          text-black dark:text-white
          hover:bg-black/10 dark:hover:bg-white/10
          transition-colors duration-300
          focus:outline-none focus:ring-0
          group
          ${settingsOpen ? activeClass : 'bg-transparent'}
        `}
        aria-label="Open Settings"
        aria-pressed={settingsOpen}
      >
        <Settings
          className={`
            w-5 h-5
            text-current
            transition-transform duration-300
            group-hover:scale-110
            ${settingsOpen ? 'rotate-45' : ''}
          `}
          aria-hidden="true"
        />
        <span className="select-none">Settings</span>
      </button>
    </div>
  );
};
