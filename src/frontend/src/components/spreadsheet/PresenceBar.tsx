import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { memo } from "react";
import type { Presence } from "../../backend.d";
import { getInitials } from "../../context/UserContext";

interface PresenceBarProps {
  presence: Presence[];
}

export const PresenceBar = memo(function PresenceBar({
  presence,
}: PresenceBarProps) {
  if (presence.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div data-ocid="presence.panel" className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {presence.slice(0, 5).map((p, i) => (
            <Tooltip key={`${p.userName}-${i}`}>
              <TooltipTrigger asChild>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-default select-none"
                  style={{
                    background: p.color,
                    color: "#0f1117",
                    boxShadow: "0 0 0 2px oklch(0.12 0.008 250)",
                    zIndex: presence.length - i,
                  }}
                >
                  {getInitials(p.userName)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {p.userName}
              </TooltipContent>
            </Tooltip>
          ))}
          {presence.length > 5 && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                background: "oklch(0.26 0.012 250)",
                color: "oklch(0.70 0.01 250)",
                boxShadow: "0 0 0 2px oklch(0.12 0.008 250)",
              }}
            >
              +{presence.length - 5}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
});
