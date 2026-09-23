import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DispatcherBoard } from './pages/DispatcherBoard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { CustomerSites } from './pages/CustomerSites';
import { TechnicianFieldView } from './pages/TechnicianFieldView';
import { CustomerPortal } from './pages/CustomerPortal';
import { UserManagement } from './pages/UserManagement';

export type Tab = 'dashboard' | 'board' | 'field' | 'customers' | 'customer' | 'users';

const defaultTabForRole = (role: string | null): Tab => {
  if (role === 'MANAGER') return 'dashboard';
  if (role === 'DISPATCHER') return 'board';
  if (role === 'TECHNICIAN') return 'field';
  return 'customer';
};

const App: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>(() => defaultTabForRole(role));

  useEffect(() => {
    setCurrentTab(defaultTabForRole(role));
  }, [role]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />
      <main className="main-content">
        {currentTab === 'dashboard' && role === 'MANAGER' && <ManagerDashboard />}

        {currentTab === 'board' && (role === 'MANAGER' || role === 'DISPATCHER') && <DispatcherBoard />}

        {currentTab === 'customers' && (role === 'MANAGER' || role === 'DISPATCHER') && <CustomerSites />}

        {currentTab === 'field' && (role === 'MANAGER' || role === 'TECHNICIAN') && <TechnicianFieldView />}

        {currentTab === 'customer' && <CustomerPortal />}

        {currentTab === 'users' && role === 'MANAGER' && <UserManagement />}
      </main>
    </div>
  );
};

export default App;
