"use client";
import { auth } from '@/lib/auth';
import { LogOut, User, Bell, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  
  // Format the title from the pathname
  const getTitle = () => {
    if (pathname === '/') return 'Dashboard Overview';
    const title = pathname.split('/')[1];
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  return (
    <header className="h-20 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-slate-200">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 w-64 group focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-slate-500 group-focus-within:text-blue-400" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            className="bg-transparent border-none outline-none text-sm text-slate-300 w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-950"></span>
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-slate-200">Admin User</div>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Administrator</div>
          </div>
          <div className="p-2 bg-slate-800 rounded-xl text-slate-400">
            <User size={20} />
          </div>
          <button 
            onClick={() => auth.logout()}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
