import { Outlet } from 'react-router-dom';
import { Sidebar } from '../ui/modern-side-bar';

export default function AppShell() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
