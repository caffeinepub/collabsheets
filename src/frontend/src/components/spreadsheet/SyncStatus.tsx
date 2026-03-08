import { memo } from "react";

export type SyncState = "saved" | "saving" | "offline";

interface SyncStatusProps {
  state: SyncState;
}

const STATES: Record<SyncState, { label: string; color: string; dot: string }> =
  {
    saved: {
      label: "Saved",
      color: "oklch(0.72 0.18 155)",
      dot: "oklch(0.72 0.18 155)",
    },
    saving: {
      label: "Saving...",
      color: "oklch(0.80 0.18 75)",
      dot: "oklch(0.80 0.18 75)",
    },
    offline: {
      label: "Offline",
      color: "oklch(0.60 0.22 25)",
      dot: "oklch(0.60 0.22 25)",
    },
  };

export const SyncStatus = memo(function SyncStatus({ state }: SyncStatusProps) {
  const s = STATES[state];
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: `${s.color}20`,
        color: s.color,
        border: `1px solid ${s.color}40`,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: s.dot,
          animation:
            state === "saving"
              ? "presence-pulse 1s ease-in-out infinite"
              : "none",
        }}
      />
      {s.label}
    </div>
  );
});
