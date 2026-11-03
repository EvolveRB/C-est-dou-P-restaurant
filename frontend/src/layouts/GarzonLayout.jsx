import { Outlet } from 'react-router-dom';
import GarzonNavbar from '../components/employee/GarzonNavbar';
import '../styles/employee.css';

export default function GarzonLayout() {
  return (
    <div className="staff-layout-container">
      <GarzonNavbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}

