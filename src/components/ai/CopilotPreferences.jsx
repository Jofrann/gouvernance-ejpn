import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TONES = [
  { value: "direct", label: "Direct", desc: "Réponses courtes et sans détour" },
  { value: "empathique", label: "Empathique", desc: "Bienveillant et pastoral" },
  { value: "soutenu", label: "Soutenu", desc: "Formel et stratégique" },
];

const FORMATS = [
  { value: "bullet_points", label: "Listes à puces", desc: "Structuré et scannable" },
  { value: "paragraphes", label: "Paragraphes", desc: "Fluide et narratif" },
  { value: "synthese_courte", label: "Synthèse courte", desc: "Maximum 3 lignes" },
];

const PROACTIVITY = [
  { value: "silencieux", label: "Silencieux", desc: "Ne s'exprime que si on lui parle" },
  { value: "alertes_uniquement", label: "Alertes seulement", desc: "Signale les urgences critiques" },
  { value: "proactif_total", label: "Proactif total", desc: "Analyse et suggère en continu" },
];

function PrefOption({ option, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(option.value)}
      className="w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between"
      style={{
        background: selected ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: selected ? "0 0 12px rgba(59,130,246,0.15)" : "none"
      }}
    >
      <div>
        <p className={`text-xs font-semibold ${selected ? "text-blue-300" : "text-zinc-300"}`}>{option.label}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{option.desc}</p>
      </div>
      {selected && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
    </button>
  );
}

export default function CopilotPreferences({ user, onSave }) {
  const { toast } = useToast();
  const prefs = user?.ai_preferences || {};
  const [tone, setTone] = useState(prefs.tone || "empathique");
  const [format, setFormat] = useState(prefs.format || "bullet_points");
  const [proactivity, setProactivity] = useState(prefs.proactivity_level || "alertes_uniquement");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        ai_preferences: { tone, format, proactivity_level: proactivity }
      });
      toast({ title: "Préférences sauvegardées", description: "Votre copilote IA a été mis à jour." });
      onSave?.({ tone, format, proactivity_level: proactivity });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))", border: "1px solid rgba(99,155,255,0.2)" }}>
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Mon Copilote IA</p>
          <p className="text-[10px] text-zinc-500">Personnalisez le comportement de l'agent</p>
        </div>
      </div>

      {/* Ton */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Ton</p>
        <div className="space-y-1.5">
          {TONES.map(t => <PrefOption key={t.value} option={t} selected={tone === t.value} onSelect={setTone} />)}
        </div>
      </div>

      {/* Format */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Format des réponses</p>
        <div className="space-y-1.5">
          {FORMATS.map(f => <PrefOption key={f.value} option={f} selected={format === f.value} onSelect={setFormat} />)}
        </div>
      </div>

      {/* Proactivité */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Niveau de proactivité</p>
        <div className="space-y-1.5">
          {PROACTIVITY.map(p => <PrefOption key={p.value} option={p} selected={proactivity === p.value} onSelect={setProactivity} />)}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))",
          border: "1px solid rgba(99,155,255,0.35)",
          boxShadow: "0 0 20px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
        }}
      >
        {saving ? "Sauvegarde…" : "Sauvegarder mes préférences"}
      </button>
    </div>
  );
}