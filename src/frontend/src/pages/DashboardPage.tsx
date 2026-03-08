import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Grid3X3,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Document } from "../backend.d";
import { getInitials, useUser } from "../context/UserContext";
import { useActor } from "../hooks/useActor";

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const date = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const { actor } = useActor();
  const { user, clearUser } = useUser();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!actor) return;
    try {
      const docs = await actor.listDocuments();
      setDocuments(
        docs.sort((a, b) => Number(b.lastModified - a.lastModified)),
      );
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/" });
      return;
    }
    loadDocuments();
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  }, [user, navigate, loadDocuments]);

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || !actor) return;
    setCreating(true);
    try {
      const id = await actor.createDocument(title);
      setNewTitle("");
      setNewDialogOpen(false);
      await loadDocuments();
      toast.success("Spreadsheet created");
      navigate({ to: "/sheet/$id", params: { id } });
    } catch {
      toast.error("Failed to create document");
    } finally {
      setCreating(false);
    }
  }, [newTitle, actor, loadDocuments, navigate]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !actor) return;
    setDeleting(true);
    try {
      await actor.deleteDocument(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadDocuments();
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, actor, loadDocuments]);

  const openDeleteDialog = useCallback((doc: Document) => {
    setDeleteTarget(doc);
    setDeleteDialogOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-background" data-ocid="dashboard.page">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between"
        style={{
          background: "oklch(0.14 0.009 250 / 0.95)",
          backdropFilter: "blur(12px)",
          borderColor: "oklch(0.26 0.012 250)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: "oklch(0.72 0.18 155 / 0.15)",
              border: "1px solid oklch(0.72 0.18 155 / 0.30)",
            }}
          >
            <Grid3X3
              className="w-4 h-4"
              style={{ color: "oklch(0.72 0.18 155)" }}
            />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            CollabSheets
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: user.color, color: "#0f1117" }}
              >
                {getInitials(user.name)}
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.name}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearUser();
              navigate({ to: "/" });
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              My Spreadsheets
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading..."
                : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-ocid="dashboard.new_button"
                className="font-medium gap-2"
                style={{
                  background: "oklch(0.72 0.18 155)",
                  color: "oklch(0.1 0.008 250)",
                }}
              >
                <Plus className="w-4 h-4" />
                New Spreadsheet
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-md"
              style={{
                background: "oklch(0.16 0.01 250)",
                border: "1px solid oklch(0.26 0.012 250)",
              }}
            >
              <DialogHeader>
                <DialogTitle>New Spreadsheet</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  data-ocid="newdoc.input"
                  placeholder="Untitled spreadsheet"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  autoFocus
                  style={{
                    background: "oklch(0.12 0.008 250)",
                    borderColor: "oklch(0.30 0.012 250)",
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setNewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  data-ocid="newdoc.submit_button"
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim()}
                  style={{
                    background: "oklch(0.72 0.18 155)",
                    color: "oklch(0.1 0.008 250)",
                  }}
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Document list */}
        {loading ? (
          <div data-ocid="dashboard.loading_state" className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-16 w-full rounded-lg"
                style={{ background: "oklch(0.18 0.012 250)" }}
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            data-ocid="dashboard.empty_state"
            className="text-center py-20 rounded-xl"
            style={{ border: "1px dashed oklch(0.30 0.012 250)" }}
          >
            <FileSpreadsheet
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "oklch(0.40 0.012 250)" }}
            />
            <p className="text-lg font-medium text-muted-foreground">
              No spreadsheets yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first spreadsheet to get started
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: idx * 0.04 }}
                  data-ocid={`dashboard.item.${idx + 1}`}
                  className="group flex items-center justify-between px-5 py-4 rounded-lg cursor-pointer"
                  style={{
                    background: "oklch(0.16 0.01 250)",
                    border: "1px solid oklch(0.26 0.012 250)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "oklch(0.40 0.012 250)";
                    (e.currentTarget as HTMLDivElement).style.background =
                      "oklch(0.18 0.011 250)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "oklch(0.26 0.012 250)";
                    (e.currentTarget as HTMLDivElement).style.background =
                      "oklch(0.16 0.01 250)";
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "oklch(0.72 0.18 155 / 0.10)" }}
                    >
                      <FileSpreadsheet
                        className="w-4 h-4"
                        style={{ color: "oklch(0.72 0.18 155)" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">
                          {doc.authorName}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(doc.lastModified)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge
                      variant="outline"
                      className="hidden sm:flex text-xs"
                      style={{
                        borderColor: "oklch(0.30 0.012 250)",
                        color: "oklch(0.56 0.01 250)",
                      }}
                    >
                      100×26
                    </Badge>
                    <Button
                      size="sm"
                      data-ocid={`dashboard.open_button.${idx + 1}`}
                      onClick={() =>
                        navigate({ to: "/sheet/$id", params: { id: doc.id } })
                      }
                      className="gap-1 font-medium"
                      style={{
                        background: "oklch(0.72 0.18 155)",
                        color: "oklch(0.1 0.008 250)",
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-ocid={`dashboard.delete_button.${idx + 1}`}
                      onClick={() => openDeleteDialog(doc)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          style={{
            background: "oklch(0.16 0.01 250)",
            border: "1px solid oklch(0.26 0.012 250)",
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Spreadsheet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              "{deleteTarget?.title}"
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              data-ocid="delete.cancel_button"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-ocid="delete.confirm_button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-8">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          Built with love using caffeine.ai
        </a>
      </footer>
    </div>
  );
}
