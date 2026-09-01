import { motion } from "framer-motion";
import type { PredictionResult } from "../../../types";
import { ru } from "../../../i18n/ru";
import { cn } from "../../../lib/utils";

const phaseColor = {
  menstrual: "var(--phase-menstrual)",
  follicular: "var(--phase-follicular)",
  fertile: "var(--phase-fertile)",
  ovulation: "var(--phase-ovulation)",
  luteal: "var(--phase-luteal)"
};

export function CycleRing({ prediction }: { prediction: PredictionResult }) {
  const isDelayed = (prediction.pendingExpectation?.daysDelayed ?? 0) > 0 || prediction.cycleDay > prediction.averageCycleLength;
  const daysOver = prediction.pendingExpectation?.daysDelayed || (prediction.cycleDay > prediction.averageCycleLength ? prediction.cycleDay - prediction.averageCycleLength : 0);
  const progress = Math.min(100, (prediction.cycleDay / prediction.averageCycleLength) * 100);
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative mx-auto grid h-64 w-64 place-items-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 240 240">
        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary-soft))"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <motion.circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          stroke={`hsl(${phaseColor[prediction.currentPhase]})`}
          strokeWidth="16"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
      </svg>

      <motion.div 
        className={cn(
          "z-10 grid h-48 w-48 place-items-center rounded-full bg-card p-4 text-center shadow-soft glass-panel relative",
          isDelayed && "ring-2 ring-coral/60 animate-pulse"
        )}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
      >
        <div>
          <p className="text-5xl font-extrabold tracking-tight">{prediction.cycleDay}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">день цикла</p>
          <p className="mt-1 text-sm font-medium text-primary">{ru.phase[prediction.currentPhase]}</p>
          {isDelayed && (
            <span className="mt-1.5 inline-block rounded-full bg-coral/15 px-2.5 py-0.5 text-[11px] font-bold text-coral">
              +{daysOver} дн. задержка
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
