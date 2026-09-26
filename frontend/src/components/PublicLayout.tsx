import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Menu, X, Siren, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_DISCLAIMER, APP_NAME } from '../config';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/live-traffic', label: 'Live Traffic' },
  { to: '/simulation', label: '3D Simulation' },
  { to: '/routes', label: 'Routes' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/about', label: 'About' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user, isOperator } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[900] border-b border-white/10 bg-navy-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="SmartFlow AI home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15">
              <Siren className="h-5 w-5 text-sky-400" aria-hidden />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">SmartFlow AI</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                {isOperator && (
                  <Link to="/admin" className="btn-link-admin text-sm font-medium text-sky-300 hover:text-sky-200">
                    Control Center
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-sky-400"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-sky-400"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            className="rounded-lg p-2 text-slate-300 hover:bg-white/5 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-white/10 px-4 pb-4 pt-2 lg:hidden" aria-label="Mobile navigation">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-slate-300'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
              {user ? (
                <>
                  {isOperator && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-navy-600 px-4 py-2.5 text-center text-sm font-medium text-sky-300">
                      Control Center
                    </Link>
                  )}
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-sky-500 px-4 py-2.5 text-center text-sm font-semibold text-navy-900">
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-navy-600 px-4 py-2.5 text-center text-sm font-medium text-white">
                    Log in
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-sky-500 px-4 py-2.5 text-center text-sm font-semibold text-navy-900">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-navy-800/50">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <div className="max-w-md">
              <p className="flex items-center gap-2 text-lg font-extrabold text-white">
                <Activity className="h-5 w-5 text-sky-400" aria-hidden /> {APP_NAME}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Intelligent traffic management and emergency vehicle prioritization, demonstrated
                through a fully simulated 3D intersection and live monitoring dashboard.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
              <div>
                <p className="mb-2 font-semibold text-white">Platform</p>
                <ul className="space-y-1.5 text-slate-400">
                  <li><Link to="/live-traffic" className="hover:text-sky-300">Live Traffic</Link></li>
                  <li><Link to="/simulation" className="hover:text-sky-300">3D Simulation</Link></li>
                  <li><Link to="/routes" className="hover:text-sky-300">Route Planner</Link></li>
                  <li><Link to="/incidents" className="hover:text-sky-300">Incidents</Link></li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-white">Project</p>
                <ul className="space-y-1.5 text-slate-400">
                  <li><Link to="/about" className="hover:text-sky-300">About System</Link></li>
                  <li><Link to="/login" className="hover:text-sky-300">Operator Login</Link></li>
                  <li><Link to="/register" className="hover:text-sky-300">Create Account</Link></li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-white">Legal</p>
                <ul className="space-y-1.5 text-slate-400">
                  <li><Link to="/privacy" className="hover:text-sky-300">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:text-sky-300">Terms and Conditions</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-xs leading-relaxed text-slate-500">{DEMO_DISCLAIMER}</p>
            <p className="mt-3 text-xs text-slate-500">
              SmartFlow AI. Educational simulation. Not connected to real traffic infrastructure.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
