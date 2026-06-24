"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateCollectionDescription,
  setCollectionPassword,
} from "@/actions/vault";

// Folder settings: edit the description and manage the optional password. A blank
// password field leaves the lock unchanged; "Remove password" opens the folder.
export function CardSettingsModal({
  id,
  description,
  locked,
  open,
  onOpenChange,
}: {
  id: string;
  description: string | null;
  locked: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(description ?? "");
  const [password, setPassword] = useState("");
  const [remove, setRemove] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(description ?? "");
      setPassword("");
      setRemove(false);
    }
  }, [open, description]);

  function save() {
    startTransition(async () => {
      try {
        await updateCollectionDescription(id, draft);
        if (remove) {
          await setCollectionPassword(id, null);
        } else if (password.trim()) {
          await setCollectionPassword(id, password.trim());
        }
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Could not save the folder");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Folder settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="card-description">Description</Label>
            <Textarea
              id="card-description"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What lives in this folder (optional)"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-password">
              {locked ? "Change password" : "Set password"}
            </Label>
            <Input
              id="card-password"
              type="password"
              value={password}
              disabled={remove}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={locked ? "Leave blank to keep current" : "Leave blank for an open folder"}
            />
            {locked ? (
              <label className="text-fg-2 mt-1 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={remove}
                  onChange={(e) => setRemove(e.target.checked)}
                />
                Remove password (make this folder open)
              </label>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
