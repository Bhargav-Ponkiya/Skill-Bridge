'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Users,
  Briefcase,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useQuery, useApolloClient } from '@apollo/client/react';
import { GET_MY_NOTIFICATIONS } from '@/graphql/queries';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const NAV = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Explore', icon: Compass, href: '/explore' },
  { name: 'Matches', icon: Users, href: '/matches' },
  { name: 'Sessions', icon: Briefcase, href: '/sessions' },
  { name: 'Notifications', icon: Bell, href: '/notifications' },
  { name: 'Profile', icon: User, href: '/profile' },
];

function NavItem({ item, active, unreadCount }: { item: typeof NAV[number]; active: boolean; unreadCount?: number }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
        active
          ? 'bg-accent-soft text-accent'
          : 'text-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      <item.icon className="w-4 h-4" />
      {item.name}
      {unreadCount !== undefined && unreadCount > 0 && (
        <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1.5 shadow-sm">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const apolloClient = useApolloClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    logout();
    try {
      await apolloClient.clearStore();
    } catch {}
    router.push('/login');
  };

  const { data: notifData } = useQuery<any>(GET_MY_NOTIFICATIONS, {
    skip: !user,
    pollInterval: 30000,
  });
  const unreadCount = (notifData?.myNotifications ?? []).filter((n: any) => !n.isRead).length;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Redirect to login if not authenticated and finished loading
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const displayUser = user;

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Sidebar — desktop */}
      <aside role="navigation" aria-label="Main navigation" className="hidden lg:flex flex-col w-64 surface border-r border-border fixed h-full z-20">
        <Link href="/dashboard" className="flex items-center gap-2 p-5">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">SkillBridge</span>
        </Link>

        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              active={pathname.startsWith(item.href)}
              unreadCount={item.name === 'Notifications' ? unreadCount : undefined}
            />
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-3">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 surface border-b border-border h-14 flex items-center justify-between px-4 lg:px-6">
          <button
            className="lg:hidden p-2 rounded-lg text-muted hover:text-fg hover:bg-surface-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">SkillBridge</span>
          </Link>

          <div className="hidden lg:block flex-1" />

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 pl-2 lg:pl-3 lg:border-l border-border"
            >
              <div className="hidden lg:flex flex-col items-end">
                <p className="text-sm font-semibold text-fg leading-none">{displayUser?.name}</p>
                <p className="text-[11px] text-muted mt-0.5">{displayUser?.email}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-sm font-bold">
                {displayUser?.name?.charAt(0).toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-fg/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="absolute inset-y-0 left-0 w-72 surface border-r border-border p-5 flex flex-col animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold">SkillBridge</span>
                </Link>
                  <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2 text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav role="navigation" aria-label="Mobile navigation" className="space-y-1 flex-1">
                {NAV.map((item) => (
                  <NavItem
                    key={item.name}
                    item={item}
                    active={pathname.startsWith(item.href)}
                    unreadCount={item.name === 'Notifications' ? unreadCount : undefined}
                  />
                ))}
              </nav>

              <div className="space-y-3 pt-3 border-t border-border">
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main id="main-content" role="main" className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
