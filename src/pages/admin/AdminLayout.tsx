import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  QrCode, 
  Menu, 
  X,
  LogOut,
  Settings as SettingsIcon,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Registrations', href: '/admin/registrations', icon: Users },
    { name: 'Registration Tracking', href: '/admin/registration-tracking', icon: ClipboardList },
    { name: 'Email Logs', href: '/admin/email-logs', icon: Mail },
    { name: 'Scanner', href: '/admin/scanner', icon: QrCode },
    { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  return (
    <div className="min-h-screen bg-slate-100/80">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">CMDA Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User info */}
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <p className="text-sm font-medium text-gray-900">
              {adminUser.firstName} {adminUser.lastName}
            </p>
            <p className="text-xs text-gray-600">{adminUser.email}</p>
            <p className="mt-1 text-xs capitalize text-slate-600">{adminUser.role}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'border border-slate-200 bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 lg:ml-0 ml-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Conference Management
            </h2>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
