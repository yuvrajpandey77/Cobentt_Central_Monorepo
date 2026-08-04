"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { CheckCircle, Mail, Calendar, CreditCard, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const trpc = useTRPC();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { data: quotaStatus } = useQuery(
    trpc.usage.quotaStatus.queryOptions()
  );

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE MY ACCOUNT") {
      toast.error("Type exactly: DELETE MY ACCOUNT");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Account deletion scheduled. You have 30 days to cancel.");
      setShowDeleteDialog(false);
      setDeleteConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule deletion");
    } finally {
      setDeleting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground">
          View your account information and manage your subscription.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Your account information synced with Clerk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {user?.emailAddresses?.[0]?.emailAddress || "Not set"}
                </p>
              </div>
            </div>
            <Badge variant={user?.emailAddresses?.[0]?.verification?.status === "verified" ? "default" : "secondary"}>
              {user?.emailAddresses?.[0]?.verification?.status === "verified" ? (
                <><CheckCircle className="mr-1 h-3 w-3" /> Verified</>
              ) : (
                "Unverified"
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Current Plan</p>
                <p className="text-sm text-muted-foreground">
                  {quotaStatus?.plan || "FREE"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. 30-day grace period.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Account</CardTitle>
              <CardDescription>
                This action is irreversible. Type <strong>DELETE MY ACCOUNT</strong> to confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE MY ACCOUNT"'
                className="font-mono"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirm("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConfirm !== "DELETE MY ACCOUNT" || deleting}
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-2 h-4 w-4" />
                  Schedule Deletion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
