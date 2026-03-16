import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BarChart3, Users, MessageSquare, User, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Primary bottom tab navigation for mobile (iOS/Android style)
const PRIMARY_TABS = [
  { page: 'Home', label: 'Accueil', icon: Home },
  { page: 'Equipe', label: 'Équipe', icon: Users },
  { page: 'Messagerie', label: 'Messages', icon: MessageSquare },
  { page: 'MonProfil', label: 'Profil', icon: User },
];

export default function BottomTabNav() {
  const location = useLocation();
  const currentPage = location.pathname.split('/').filter(Boolean)[0] || 'Home';

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#060810]/98 to-[#0f1117]/90 backdrop-blur-xl border-t border-white/10"
      style={{
        paddingBottom: 'var(--safe-area-inset-bottom, 0)',
      }}
    >
      <div className="flex items-center justify-between h-16 px-2 max-w-7xl mx-auto">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.page;

          return (
            <Link
              key={tab.page}
              to={createPageUrl(tab.page)}
              className="flex-1 flex flex-col items-center justify-center h-16 relative group"
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500"
                  transition={{ duration: 0.2 }}
                />
              )}

              {/* Icon */}
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg transition-all',
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-zinc-500 group-hover:text-zinc-300'
                )}
              >
                <Icon className="w-5 h-5" />
              </motion.div>

              {/* Label */}
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium transition-colors',
                  isActive ? 'text-white' : 'text-zinc-500'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}