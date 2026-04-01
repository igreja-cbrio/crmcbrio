import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
  },
};

export default function AppShell() {
  return (
    <div style={styles.shell}>
      <Sidebar />
      <div style={styles.main}>
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
