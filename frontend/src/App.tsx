import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { HomeDashboard } from './pages/HomeDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { DispatcherBoard } from './pages/DispatcherBoard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { CustomerSites } from './pages/CustomerSites';
import { TechnicianFieldView } from './pages/TechnicianFieldView';
import { CustomerPortal } from './pages/CustomerPortal';
import { UserManagement } from './pages/UserManagement';
import { NotificationsPage } from './pages/NotificationsPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { TechniciansPage } from './pages/TechniciansPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { MyPaymentsPage } from './pages/MyPaymentsPage';
import { CustomersPage } from './pages/CustomersPage';
import { StaffPage } from './pages/StaffPage';
import { AttendancePage } from './pages/AttendancePage';
import { isTabAllowed, Tab, tabFromHash } from './navigation';

export type { Tab } from './navigation';

const App: React.FC = () => {
  const { viewRole, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>(tabFromHash);

  // Keep the page in sync with the URL hash (back/forward buttons and refresh).
  useEffect(() => {
    const onHashChange = () => setCurrentTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goTo = (tab: Tab) => {
    window.location.hash = `/${tab}`;
    setCurrentTab(tab);
  };

  // A page the current role (or the manager's "View As" role) may not use falls back to the dashboard.
  const tab: Tab = isTabAllowed(viewRole, currentTab) ? currentTab : 'home';

  // Keep the URL in step with that fallback, e.g. #/login becomes #/home after signing in.
  useEffect(() => {
    if (isAuthenticated && tab !== currentTab) {
      window.history.replaceState(null, '', `#/${tab}`);
    }
  }, [isAuthenticated, tab, currentTab]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="ks-shell">
      <Navbar onTabChange={goTo} />
      <div className="ks-body">
        <Sidebar currentTab={tab} onTabChange={goTo} />
        <main className="ks-content">
          <div className="ks-content-inner" key={`${viewRole}-${tab}`}>
            {tab === 'home' && <HomeDashboard onTabChange={goTo} />}
            {tab === 'profile' && <ProfilePage />}
            {tab === 'reports' && <ManagerDashboard />}
            {tab === 'board' && <DispatcherBoard />}
            {/* Managers get customer accounts + organisations; dispatchers keep organisations & sites only. */}
            {tab === 'customers' && (viewRole === 'MANAGER' ? <CustomersPage /> : <CustomerSites />)}
            {tab === 'staff' && <StaffPage />}
            {tab === 'attendance' && <AttendancePage />}
            {tab === 'field' && <TechnicianFieldView />}
            {tab === 'customer' && <CustomerPortal onTabChange={goTo} />}
            {tab === 'users' && <UserManagement />}
            {tab === 'notifications' && <NotificationsPage onTabChange={goTo} />}
            {tab === 'deliveries' && <DeliveriesPage />}
            {tab === 'technicians' && <TechniciansPage />}
            {tab === 'tasks' && <MyTasksPage onTabChange={goTo} />}
            {tab === 'payments' && <PaymentsPage />}
            {tab === 'mypayments' && <MyPaymentsPage />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
