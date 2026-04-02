import { Outlet } from 'react-router-dom';
import { Sidebar } from '../ui/modern-side-bar';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function AppShell() {
  const { isDark, setIsDark } = useTheme();

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-14 transition-all">
        {/* Top bar */}
        <div className="flex items-center justify-end h-12 px-6 shrink-0">
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[#737373] hover:text-[#e5e5e5] hover:bg-[#1e1e1e] transition-colors"
            aria-label="Alternar tema"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
        <main className="flex-1 px-8 pb-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
