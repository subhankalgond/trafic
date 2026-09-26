import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map as MapIcon, Boxes, FileWarning, Route as RouteIcon, Bell, User,
  LogOut, Menu, X, Siren, Gauge, Settings, Users, ScrollText, Car, Flag, Activity, Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_DISCLAIMER } from '../config';

const USER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live-traffic', label: 'Live Traffic', icon: MapIcon },
  { to: '/simulation', label: '3D Simulation', icon: Boxes },
  { to: '/routes', label: 'Routes', icon: RouteIcon },
  { to: '/incidents', label: 'Incidents', icon: FileWarning },
  { to: '/user-reports', label: 'My Reports', icon: Flag },
  { to: '/saved-routes', label: 'Saved Routes', icon: RouteIcon },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: Gauge },
  { to: '/admin/live-control', label: 'Live Control', icon: Activity },
  { to: '/admin/traffic', label: 'Traffic Management', icon: Activity },
  { to: '/admin/emergency', label: 'Emergency', icon: Siren },
  { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { to: '/admin/incidents', label: 'Incidents', icon: FileWarning },
  { to: '/admin/roads', label: 'Roads', icon: MapIcon },
  { to: '/admin/signals', label: 'Signals', icon: Radio },
  { to: '/admin/analytics', label: 'Analytics', icon: Gauge },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/logs', label: 'System Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/live-traffic', label: 'Traffic', icon: MapIcon },
  { to: '/simulation', label: 'Simulate', icon: Boxes },
  { to: '/user-reports', label: 'Reports', icon: Flag },
  { to: '/profile', label: 'Profile', icon: User },
];

function NavItems({ items, onNavigate }: { items: typeof USER_NAV; onNavigate?: () => void }) {
  return (
    <>
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-sky-500/15 text-sky-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <n.icon className="h-[18px] w-[18px]" aria-hidden />
          {n.label}
        </NavLink>
      ))}
    </>
  );
}

export default function AppLayout({ admin = false }: { admin?: boolean }) {
  const { user, logout, isOperator } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = admin ? ADMIN_NAV : USER_NAV;

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const allowed = admin ? isOperator : true;
  if (admin && !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <h1 className="text-lg font-bold text-white">Access restricted</h1>
          <p className="mt-2 text-sm text-slate-300">
            The control center requires an operator or admin account.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-navy-900">
            Back to dashboard
          </Link>
        </div>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-navy-800/60 lg:flex">
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15">
            <Siren className="h-5 w-5 text-sky-400" aria-hidden />
          </span>
          <span className="text-lg font-extrabold text-white">SmartFlow</span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Dashboard navigation">
          <NavItems items={nav} />
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden /> Log out
          </button>
        </div>
      </aside>

      {/* mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[950] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} aria-hidden />
          <div className="glass absolute left-0 top-0 h-full w-72 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between px-2 py-2">
              <span className="text-lg font-extrabold text-white">SmartFlow</span>
              <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="p-1 text-slate-400">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1" aria-label="Mobile dashboard navigation">
              <NavItems items={nav} onNavigate={() => setSidebarOpen(false)} />
            </nav>
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden /> Log out
            </button>
          </div>
        </div>
      )}

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[900] flex h-16 items-center justify-between border-b border-white/10 bg-navy-900/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-300 hover:bg-white/5 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <p className="text-sm font-bold text-white">
                {admin ? 'Smart Traffic Control Center' : `Welcome, ${user.name.split(' ')[0]}`}
              </p>
              <p className="text-xs text-slate-400">
                {admin ? 'Operator console' : user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden /> System Online
            </span>
            {!admin && isOperator && (
              <Link to="/admin" className="rounded-lg bg-navy-600 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-navy-700">
                Control Center
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>

        <footer className="hidden border-t border-white/10 px-6 py-4 lg:block">
          <p className="text-xs text-slate-500">{DEMO_DISCLAIMER}</p>
        </footer>
      </div>

      {/* mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[940] flex border-t border-white/10 bg-navy-900/95 backdrop-blur lg:hidden"
        aria-label="Bottom navigation"
      >
        {MOBILE_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-sky-300' : 'text-slate-400'
              }`
            }
          >
            <n.icon className="h-5 w-5" aria-hidden />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}


