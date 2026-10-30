import StaffLoginForm from '../../components/employee/StaffLoginForm';
import '../../styles/employee.css';

export default function EmployeeLoginPage() {
  return (
    <div className="employee-login-viewport">
      {/* Ventana de inicio de sesión perfectamente centrada */}
      <StaffLoginForm />
    </div>
  );
}
