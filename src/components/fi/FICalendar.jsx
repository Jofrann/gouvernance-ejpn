import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_COLORS = {
  temps_fort: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  reunion: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  formation: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  evangelisation: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  celebiration: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  autre: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

export default function FICalendar({ events, onSelectEvent, onCreateEvent, onDeleteEvent, canEdit }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day) =>
    events.filter((e) => {
      const eventDate = new Date(e.date_debut);
      return isSameDay(eventDate, day);
    });

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">{format(currentMonth, "MMMM yyyy", { locale: fr })}</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-zinc-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 bg-white/[0.02] p-3 rounded-xl border border-white/[0.07]">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <div
              key={i}
              onClick={() => setSelectedDay(day)}
              className={`min-h-24 p-1.5 rounded-lg cursor-pointer transition-all border ${
                isSelected
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-white/[0.05] hover:border-white/[0.1]"
              } ${!isCurrentMonth ? "bg-white/[0.01]" : ""}`}
            >
              <p className={`text-[10px] font-bold mb-1 ${isCurrentMonth ? "text-white" : "text-zinc-600"}`}>
                {format(day, "d")}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((evt) => (
                  <div
                    key={evt.id}
                    className="text-[8px] px-1 py-0.5 rounded bg-white/10 text-white truncate hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(evt);
                    }}
                  >
                    {evt.titre}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-[8px] text-zinc-500">+{dayEvents.length - 2}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Events */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">
                  {format(selectedDay, "EEEE d MMMM", { locale: fr })}
                </p>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 h-7"
                    onClick={() => {
                      setShowForm(true);
                    }}
                  >
                    <Plus className="w-3 h-3" /> Événement
                  </Button>
                )}
              </div>

              {getEventsForDay(selectedDay).length === 0 ? (
                <p className="text-xs text-zinc-500">Aucun événement ce jour</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDay(selectedDay).map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-start justify-between p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] cursor-pointer transition-all"
                      onClick={() => onSelectEvent(evt)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-bold text-white truncate">{evt.titre}</p>
                          <Badge className={`text-[8px] px-1 border ${TYPE_COLORS[evt.type]}`}>
                            {evt.type}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-zinc-500">{format(parseISO(evt.date_debut), "HH:mm")}</p>
                      </div>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEvent(evt.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}