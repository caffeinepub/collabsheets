import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import { Grid3X3 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getRandomColor, useUser } from "../context/UserContext";
import { useActor } from "../hooks/useActor";
import { USER_COLORS } from "../utils/colors";

// Google "G" SVG logo in original brand colors
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  const [guestName, setGuestName] = useState("");
  const [guestColor, setGuestColor] = useState<string>(getRandomColor());

  // Google dialog state
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [googleName, setGoogleName] = useState("");
  const [googleColor, setGoogleColor] = useState<string>(getRandomColor());
  const [googleLoading, setGoogleLoading] = useState(false);

  const { setUser } = useUser();
  const { actor } = useActor();
  const navigate = useNavigate();

  const handleGuestSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = guestName.trim();
      if (!trimmedName) {
        toast.error("Please enter a display name");
        return;
      }
      setUser({ name: trimmedName, color: guestColor });
      if (actor) {
        actor
          .saveCallerUserProfile({ name: trimmedName, color: guestColor })
          .catch(() => {
            /* ignore backend errors */
          });
      }
      navigate({ to: "/dashboard" });
    },
    [guestName, guestColor, actor, setUser, navigate],
  );

  const handleGoogleContinue = useCallback(async () => {
    const trimmedName = googleName.trim();
    if (!trimmedName) {
      toast.error("Please enter your name");
      return;
    }
    setGoogleLoading(true);
    setUser({ name: trimmedName, color: googleColor });
    if (actor) {
      actor
        .saveCallerUserProfile({ name: trimmedName, color: googleColor })
        .catch(() => {
          /* ignore backend errors */
        });
    }
    setGoogleDialogOpen(false);
    navigate({ to: "/dashboard" });
    setGoogleLoading(false);
  }, [googleName, googleColor, actor, setUser, navigate]);

  const openGoogleDialog = useCallback(() => {
    setGoogleName("");
    setGoogleColor(getRandomColor());
    setGoogleDialogOpen(true);
  }, []);

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
          {/* Continue with Google button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <button
              type="button"
              data-ocid="auth.google_button"
              onClick={openGoogleDialog}
              className="w-full h-10 flex items-center justify-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer"
              style={{
                background: "oklch(0.97 0 0)",
                border: "1px solid oklch(0.82 0.005 250)",
                color: "oklch(0.2 0.01 250)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(0.92 0 0)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(0.97 0 0)";
              }}
            >
              <GoogleLogo size={18} />
              Sign in with Google
            </button>
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div
              className="flex-1 h-px"
              style={{ background: "oklch(0.30 0.012 250)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.55 0.015 250)" }}
            >
              or continue as guest
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "oklch(0.30 0.012 250)" }}
            />
          </div>

          {/* Guest form */}
          <form onSubmit={handleGuestSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="guest-name" className="text-sm font-medium">
                Your display name
              </Label>
              <Input
                id="guest-name"
                data-ocid="auth.input"
                placeholder="Enter your name..."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
                maxLength={40}
                className="h-10 text-sm"
                style={{
                  background: "oklch(0.12 0.008 250)",
                  borderColor: "oklch(0.30 0.012 250)",
                }}
              />
              <p className="text-xs text-muted-foreground">
                This name will appear to collaborators in spreadsheets.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Choose a color</Label>
              <div className="flex gap-2 flex-wrap">
                {USER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGuestColor(c)}
                    className="w-8 h-8 rounded-lg transition-all duration-150 flex items-center justify-center"
                    style={{
                      backgroundColor: c,
                      outline:
                        guestColor === c
                          ? "2px solid oklch(0.93 0.01 240)"
                          : "none",
                      outlineOffset: "2px",
                      transform: guestColor === c ? "scale(1.1)" : "scale(1)",
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              data-ocid="auth.submit_button"
              disabled={!guestName.trim()}
              className="w-full h-10 font-medium"
              style={{
                background: "oklch(0.72 0.18 155)",
                color: "oklch(0.1 0.008 250)",
              }}
            >
              Start collaborating
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

      {/* Google sign-in dialog */}
      <Dialog open={googleDialogOpen} onOpenChange={setGoogleDialogOpen}>
        <DialogContent
          data-ocid="auth.google_dialog"
          className="sm:max-w-sm"
          style={{
            background: "oklch(0.16 0.01 250)",
            border: "1px solid oklch(0.26 0.012 250)",
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <GoogleLogo size={22} />
              <DialogTitle className="text-base font-semibold">
                Sign in with Google
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter the name you want collaborators to see when you're editing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="google-display-name"
                className="text-sm font-medium"
              >
                Display name
              </Label>
              <Input
                id="google-display-name"
                data-ocid="auth.google_name_input"
                placeholder="Your name"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                autoFocus
                maxLength={40}
                className="h-10 text-sm"
                style={{
                  background: "oklch(0.12 0.008 250)",
                  borderColor: "oklch(0.30 0.012 250)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && googleName.trim()) {
                    void handleGoogleContinue();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose a color</Label>
              <div className="flex gap-2 flex-wrap">
                {USER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGoogleColor(c)}
                    className="w-7 h-7 rounded-lg transition-all duration-150"
                    style={{
                      backgroundColor: c,
                      outline:
                        googleColor === c
                          ? "2px solid oklch(0.93 0.01 240)"
                          : "none",
                      outlineOffset: "2px",
                      transform: googleColor === c ? "scale(1.1)" : "scale(1)",
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="auth.cancel_button"
              onClick={() => setGoogleDialogOpen(false)}
              className="flex-1"
              style={{
                borderColor: "oklch(0.30 0.012 250)",
                background: "transparent",
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-ocid="auth.google_confirm_button"
              disabled={!googleName.trim() || googleLoading}
              onClick={() => void handleGoogleContinue()}
              className="flex-1 font-medium"
              style={{
                background: "oklch(0.72 0.18 155)",
                color: "oklch(0.1 0.008 250)",
              }}
            >
              {googleLoading ? "Signing in..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
