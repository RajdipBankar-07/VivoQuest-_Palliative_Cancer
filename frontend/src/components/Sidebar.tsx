'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Compass, 
  Bot, 
  Users, 
  FileText, 
  User, 
  Settings, 
  Building2, 
  Sparkles, 
  HeartHandshake, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Trophy,
  Calendar,
  Stethoscope,
  Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const [role, setRole] = useState<string>('USER');
  const [plan, setPlan] = useState<string>('FREE');

  useEffect(() => {
    const updateAuthInfo = () => {
      const storedRole = localStorage.getItem('vivo_role') || 'USER';
      const storedPlan = localStorage.getItem('vivo_plan') || 'FREE';
      setRole(storedRole);
      setPlan(storedPlan);
    };

    updateAuthInfo();
    window.addEventListener('personalization_loaded', updateAuthInfo);
    return () => {
      window.removeEventListener('personalization_loaded', updateAuthInfo);
    };
  }, []);

  const mainTabs = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/doctors', label: 'Find a Doctor', icon: Stethoscope },
    { href: '/appointments', label: 'Appointments', icon: Calendar },
    { href: '/journey', label: 'Journey', icon: Compass },
    { href: '/gamification', label: 'Rewards & Arena', icon: Trophy },
    { href: '/vivoai', label: 'VivoAI Coach', icon: Bot },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ] as const;

  const filteredTabs = mainTabs.filter(tab => {
    if (tab.href === '/vivoai' || tab.href === '/reports') {
      return plan === 'PRO' || plan === 'ENTERPRISE' || role === 'SUPER_ADMIN';
    }
    return true;
  });

  const filteredPortals: Array<{ href: string; label: string; icon: any }> = [];
  
  if (role === 'professional' || role === 'super_admin' || role === 'SUPER_ADMIN' || role === 'admin') {
    filteredPortals.push({ href: '/doctor/dashboard', label: 'Doctor Schedule Portal', icon: Stethoscope });
  }
  if (role === 'hospital' || role === 'hospital_staff' || role === 'super_admin' || role === 'SUPER_ADMIN' || role === 'admin') {
    filteredPortals.push({ href: '/hospital/dashboard', label: 'Hospital Portal', icon: Building2 });
  }
  if (role === 'admin' || role === 'super_admin' || role === 'SUPER_ADMIN') {
    filteredPortals.push({ href: '/admin/dashboard', label: 'Admin Operations', icon: Activity });
  }
  if (role === 'super_admin' || role === 'SUPER_ADMIN') {
    filteredPortals.push({ href: '/super-admin/dashboard', label: 'Super-Admin Governance', icon: Settings });
  }
  if (role === 'CORP_ADMIN' || role === 'super_admin' || role === 'SUPER_ADMIN') {
    filteredPortals.push({ href: '/corporate-wellness', label: 'Corporate Wellness', icon: Building2 });
  }
  if (role === 'LEADER' || role === 'super_admin' || role === 'SUPER_ADMIN') {
    filteredPortals.push({ href: '/creator', label: 'Creator Portal', icon: Sparkles });
  }
  if (role === 'CLINICAL_OP' || role === 'super_admin' || role === 'SUPER_ADMIN') {
    filteredPortals.push({ href: '/clinical', label: 'Clinical Operator', icon: HeartHandshake });
  }

  const handleLogout = async () => {
    const token = localStorage.getItem('vivo_token');
    try {
      await fetch('http://127.0.0.1:3001/api/auth/logout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    
    // Clear all storage
    localStorage.removeItem('vivo_token');
    localStorage.removeItem('vivo_role');
    localStorage.removeItem('vivo_plan');
    localStorage.removeItem('vivo_persona');
    localStorage.removeItem('vivo_sport');
    localStorage.removeItem('vivo_community_type');
    localStorage.removeItem('vivo_challenges');
    localStorage.removeItem('vivo_ai_insight');
    localStorage.removeItem('vivo_reports');
    
    // Clear cookies as well
    document.cookie = "vivo_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "vivo_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "vivo_tier=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    router.push('/');
  };

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative group ${
          isActive 
            ? 'bg-primary text-white shadow-md' 
            : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
        }`}
      >
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
        
        {(!isCollapsed || isMobileOpen) && (
          <span 
            className="transition-opacity duration-300 font-medium"
            style={{ 
              fontFamily: 'var(--font-body)',
              fontSize: '14px'
            }}
          >
            {label}
          </span>
        )}

        {isCollapsed && !isMobileOpen && (
          <div className="absolute left-16 bg-primary text-white text-xs py-1.5 px-3 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-50">
            {label}
          </div>
        )}
        
        {isActive && !isCollapsed && (
          <div className="ml-auto w-1 h-5 bg-card-lime rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0 w-full relative z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <div className="w-4 h-4 border-2 border-white rounded-full opacity-80" />
          </div>
          <span className="text-xl text-primary font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
            VivoQuest
          </span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)} 
          className="text-primary p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Container */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-40 bg-card border-r border-border flex flex-col justify-between py-6 px-4 shrink-0 shadow-lg transition-all duration-300
          lg:translate-x-0 lg:relative
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Toggle button for desktop */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute top-5 -right-3.5 w-7 h-7 bg-card border border-border rounded-full items-center justify-center text-primary shadow-md hover:bg-secondary transition-colors z-50"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide gap-6">
          {/* Logo / Branding */}
          <div className={`px-4 mb-4 flex items-center gap-3 ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shrink-0">
              <div className="w-4 h-4 border-2 border-white rounded-full opacity-80" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span 
                className="text-xl text-primary font-extrabold whitespace-nowrap" 
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                VivoQuest
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-6">
            <nav className="flex flex-col gap-1.5">
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-xs font-bold text-muted-foreground px-4 mb-2 uppercase tracking-wider block">
                  Core App
                </span>
              )}
              {filteredTabs.map((tab) => (
                <NavLink key={tab.href} href={tab.href} label={tab.label} icon={tab.icon} />
              ))}
            </nav>

            {filteredPortals.length > 0 && (
              <>
                <div className="w-full h-px bg-border/60" />

                <nav className="flex flex-col gap-1.5">
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="text-xs font-bold text-muted-foreground px-4 mb-2 uppercase tracking-wider block">
                      Enterprise Portals
                    </span>
                  )}
                  {filteredPortals.map((tab) => (
                    <NavLink key={tab.href} href={tab.href} label={tab.label} icon={tab.icon} />
                  ))}
                </nav>
              </>
            )}
          </div>
        </div>

        {/* Footer / Logout */}
        <div className="mt-auto pt-6 border-t border-border/60">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-4 px-4 py-3 w-full rounded-xl transition-all text-muted-foreground hover:bg-red-500/10 hover:text-red-500 group relative ${
              isCollapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut size={20} className="shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500 }}>
                Log out
              </span>
            )}
            {isCollapsed && !isMobileOpen && (
              <div className="absolute left-16 bg-red-500 text-white text-xs py-1.5 px-3 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-50">
                Log out
              </div>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}
    </>
  );
}
