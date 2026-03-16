import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';

// Root-level screens where we show the logo/title instead of back button
const ROOT_PAGES = ['Home', 'Equipe', 'Messagerie', 'MonProfil'];

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract current page from pathname
  const currentPage = location.pathname.split('/').filter(Boolean)[0] || 'Home';
  const isRootPage = ROOT_PAGES.includes(currentPage);

  if (isRootPage) {
    return null; // Root pages don't need back button
  }

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      onClick={() => navigate(-1)}
      className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
      title="Retour"
    >
      <ChevronLeft className="w-5 h-5" />
    </motion.button>
  );
}