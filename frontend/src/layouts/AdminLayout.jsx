import { Outlet } from 'react-router-dom';
import AdminNavbar from '../components/employee/AdminNavbar';
import '../styles/employee.css';

export default function AdminLayout() {
  return (
    <div className="staff-layout-container">
      <AdminNavbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}

