import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import { Grid3X3, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getRandomColor, useUser } from "../context/UserContext";
import { useActor } from "../hooks/useActor";
import { USER_COLORS } from "../utils/colors";

export default function AuthPage() {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(getRandomColor());
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();
  const { actor } = useActor();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error("Please enter a display name");
        return;
      }
      setLoading(true);
      try {
        if (actor) {
          await actor.saveCallerUserProfile({ name: trimmedName, color });
        }
        setUser({ name: trimmedName, color });
        navigate({ to: "/dashboard" });
      } catch {
        toast.error("Failed to save profile, please try again");
      } finally {
        setLoading(false);
      }
    },
    [name, color, actor, setUser, navigate],
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.72 0.18 155) 1px, transparent 1px), linear-gradient(90deg, oklch(0.72 0.18 155) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Logo area */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5"
            style={{
              background: "oklch(0.72 0.18 155 / 0.15)",
              border: "1px solid oklch(0.72 0.18 155 / 0.30)",
            }}
          >
            <Grid3X3
              className="w-7 h-7"
              style={{ color: "oklch(0.72 0.18 155)" }}
            />
          </motion.div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            CollabSheets
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Real-time collaborative spreadsheets
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{
            background: "oklch(0.16 0.01 250)",
            border: "1px solid oklch(0.26 0.012 250)",
            boxShadow: "0 24px 48px oklch(0 0 0 / 0.4)",
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles
              className="w-4 h-4"
              style={{ color: "oklch(0.72 0.18 155)" }}
            />
            <span className="text-sm font-medium">Join as guest</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-sm font-medium">
                Display name
              </Label>
              <Input
                id="display-name"
                data-ocid="auth.input"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={40}
                className="h-10 font-mono text-sm"
                style={{
                  background: "oklch(0.12 0.008 250)",
                  borderColor: "oklch(0.30 0.012 250)",
                }}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Choose a color</Label>
              <div className="flex gap-2 flex-wrap">
                {USER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-lg transition-all duration-150 flex items-center justify-center"
                    style={{
                      backgroundColor: c,
                      outline:
                        color === c ? "2px solid oklch(0.93 0.01 240)" : "none",
                      outlineOffset: "2px",
                      transform: color === c ? "scale(1.1)" : "scale(1)",
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              data-ocid="auth.submit_button"
              disabled={loading || !name.trim()}
              className="w-full h-10 font-medium"
              style={{
                background: "oklch(0.72 0.18 155)",
                color: "oklch(0.1 0.008 250)",
              }}
            >
              {loading ? "Saving..." : "Start collaborating →"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
