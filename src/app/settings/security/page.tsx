"use client";

import { useUser, useSession } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Smartphone, Key, Monitor, LogOut, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";

interface SessionInfo {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  deviceType: string;
  browser: string;
  os: string;
  isCurrent: boolean;
}

export default function SecurityPage() {
  const { user, isLoaded } = useUser();
  const { session } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Sessions endpoint not available
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSignOutAll = async () => {
    setSigningOut(true);
    try {
      const res = await fetch("/api/settings/sessions", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to sign out");
      toast.success("All other sessions signed out");
      fetchSessions();
    } catch {
      toast.error("Failed to sign out sessions");
    } finally {
      setSigningOut(false);
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
        <h1 className="text-2xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground">
          Manage your password, two-factor authentication, and sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>
            Manage your password for account security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                {user?.passwordEnabled ? "Set" : "Not set (using social login)"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info("Password management available in Clerk profile");
              }}
            >
              {user?.passwordEnabled ? "Change Password" : "Set Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                {user?.twoFactorEnabled ? "Enabled" : "Not enabled"}
              </p>
            </div>
            <Badge variant={user?.twoFactorEnabled ? "default" : "secondary"}>
              {user?.twoFactorEnabled ? (
                <><Shield className="mr-1 h-3 w-3" /> Enabled</>
              ) : (
                "Disabled"
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage your active sessions and sign out from devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSessions ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {s.browser} on {s.os}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Active {new Date(s.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {s.isCurrent ? (
                  <Badge variant="default">Current</Badge>
                ) : (
                  <Button variant="ghost" size="sm">
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Current Session</p>
                  <p className="text-xs text-muted-foreground">
                    {session?.createdAt ? new Date(session.createdAt).toLocaleString() : "Active now"}
                  </p>
                </div>
              </div>
              <Badge variant="default">Current</Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Sign out from all other devices.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOutAll}
              disabled={signingOut}
            >
              {signingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign Out All Devices
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
