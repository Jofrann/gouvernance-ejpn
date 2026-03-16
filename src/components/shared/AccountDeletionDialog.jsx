import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AccountDeletionDialog({ user, isOpen, onClose }) {
  const [step, setStep] = useState(0); // 0 = confirm, 1 = irreversible
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Call backend function to delete account
      await base44.functions.invoke('deleteUserAccount', { userId: user.id });
      toast.success('Votre compte a été supprimé');
      // Redirect to login
      base44.auth.logout('/');
    } catch (err) {
      toast.error('Erreur lors de la suppression du compte');
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#0f1117] border border-red-500/20 shadow-2xl overflow-hidden"
          >
            {step === 0 ? (
              // Step 1: Confirmation
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h2 className="text-lg font-bold text-white">Supprimer votre compte</h2>
                </div>
                <p className="text-sm text-zinc-400">
                  Êtes-vous certain de vouloir supprimer votre compte ? Cette action est <strong>irréversible</strong>.
                </p>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-300">
                    <strong>⚠️ Données supprimées :</strong> Votre profil, vos messages, vos livres de formation, et tous vos enregistrements seront définitivement effacés des serveurs.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-medium transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Continuer
                  </button>
                </div>
              </div>
            ) : (
              // Step 2: Irreversible warning
              <div className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-red-400">Êtes-vous vraiment sûr ?</h2>
                <p className="text-sm text-zinc-400">
                  Ceci est votre <strong>dernier avertissement</strong>. Après cela, votre compte ne pourra jamais être récupéré.
                </p>
                <p className="text-xs text-zinc-500 p-3 bg-white/5 rounded-lg border border-white/10">
                  Tous les liens, l'historique, les messages et les associati ons seront supprimés. Vous ne pourrez pas vous reconnecter avec cette adresse e-mail.
                </p>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep(0)}
                    className="flex-1 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-medium transition-all"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}