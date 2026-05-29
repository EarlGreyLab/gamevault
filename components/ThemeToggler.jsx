import { useEffect } from 'react';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';

export function ThemeToggler() {
  useEffect(() => {
    const html = document.documentElement;

    // Sync data-theme to match the .dark class state on every class mutation.
    // AnimatedThemeToggler calls classList.toggle("dark") on click; this observer
    // keeps data-theme (used by main app CSS) and localStorage in sync.
    const obs = new MutationObserver(() => {
      const dark = html.classList.contains('dark');
      html.setAttribute('data-theme', dark ? 'dark' : 'light');
      localStorage.setItem('gv-theme', dark ? 'dark' : 'light');
    });
    obs.observe(html, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return <AnimatedThemeToggler />;
}
