import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useRedeemBuzzSecret } from "../hooks/useQueries";

interface CreateBuzzModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBuzzModal({ isOpen, onClose }: CreateBuzzModalProps) {
  const [secret, setSecret] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const redeemBuzzSecret = useRedeemBuzzSecret();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;

    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const result = await redeemBuzzSecret.mutateAsync(secret.trim());
      if ("ok" in result) {
        setSuccessMsg(result.ok);
        setSecret("");
      } else {
        setErrorMsg(result.err);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to redeem secret",
      );
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSecret("");
      setSuccessMsg(null);
      setErrorMsg(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-ocid="create_buzz.dialog">
        <DialogHeader>
          <DialogTitle>Create Buzz</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Enter a Buzz secret code from the text game to add Buzz to your
            wallet. Codes are valid for 24 hours and can only be used once.
          </p>

          {successMsg && (
            <div
              className="flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400"
              data-ocid="create_buzz.success_state"
            >
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              data-ocid="create_buzz.error_state"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buzz-secret-input">Secret Code</Label>
                <Input
                  id="buzz-secret-input"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="buzz-xxxxxx-xxxxxxxxxx-xxxxxxxx"
                  className="font-mono text-sm"
                  disabled={redeemBuzzSecret.isPending}
                  data-ocid="create_buzz.input"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenChange.bind(null, false)}
                  disabled={redeemBuzzSecret.isPending}
                  data-ocid="create_buzz.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!secret.trim() || redeemBuzzSecret.isPending}
                  data-ocid="create_buzz.submit_button"
                >
                  {redeemBuzzSecret.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    "Create Buzz"
                  )}
                </Button>
              </div>
            </form>
          )}

          {successMsg && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleOpenChange.bind(null, false)}
                data-ocid="create_buzz.close_button"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
