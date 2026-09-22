import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DispatcherBoard } from './pages/DispatcherBoard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { CustomerSites } from './pages/CustomerSites';
import { TechnicianFieldView } from './pages/TechnicianFieldView';
import { CustomerPortal } from './pages/CustomerPortal';

type Tab = 'dashboard' | 'board' | 'field' | 'customers' | 'customer';

const App: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        {currentTab === 'dashboard' && role === 'MANAGER' && <ManagerDashboard />}

        {currentTab === 'board' && (role === 'MANAGER' || role === 'DISPATCHER') && <DispatcherBoard />}

        {currentTab === 'customers' && (role === 'MANAGER' || role === 'DISPATCHER') && <CustomerSites />}

        {currentTab === 'field' && (role === 'MANAGER' || role === 'TECHNICIAN') && <TechnicianFieldView />}

        {currentTab === 'customer' && <CustomerPortal />}
      </main>
    </div>
  );
};

export default App;