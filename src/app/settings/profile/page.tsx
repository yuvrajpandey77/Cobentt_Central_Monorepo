"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProfileData {
  bio: string;
  company: string;
  website: string;
  location: string;
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");

  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [savedBio, setSavedBio] = useState("");
  const [savedWebsite, setSavedWebsite] = useState("");
  const [savedLocation, setSavedLocation] = useState("");
  const [savedCompany, setSavedCompany] = useState("");

  useEffect(() => {
    if (isLoaded && user) {
      const name = user.fullName || "";
      setDisplayName(name);
      setSavedDisplayName(name);

      fetch("/api/settings/profile")
        .then((res) => res.json())
        .then((data: ProfileData) => {
          const b = data.bio || "";
          const c = data.company || "";
          const w = data.website || "";
          const l = data.location || "";
          setBio(b);
          setCompany(c);
          setWebsite(w);
          setLocation(l);
          setSavedBio(b);
          setSavedCompany(c);
          setSavedWebsite(w);
          setSavedLocation(l);
        })
        .catch(() => {});
    }
  }, [isLoaded, user]);

  const hasChanges =
    displayName !== savedDisplayName ||
    bio !== savedBio ||
    company !== savedCompany ||
    website !== savedWebsite ||
    location !== savedLocation;

  const handleSave = async () => {
    setSaving(true);
    try {
      await user?.update({
        firstName: displayName.split(" ")[0] || undefined,
        lastName: displayName.split(" ").slice(1).join(" ") || undefined,
      });

      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, company, website, location }),
      });

      if (!res.ok) throw new Error("Failed to save profile");

      setSavedDisplayName(displayName);
      setSavedBio(bio);
      setSavedCompany(company);
      setSavedWebsite(website);
      setSavedLocation(location);

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
      setDisplayName(savedDisplayName);
      setBio(savedBio);
      setCompany(savedCompany);
      setWebsite(savedWebsite);
      setLocation(savedLocation);
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your public profile information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>
            Click on the avatar to upload a custom one from your files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
              <AvatarFallback className="text-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("Image must be under 2MB");
                        return;
                      }
                      try {
                        await user?.setProfileImage({ file });
                        toast.success("Photo updated");
                      } catch {
                        toast.error("Failed to upload photo");
                      }
                    }}
                  />
                </label>
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, GIF or PNG. Max size 2MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details. This information will be displayed on your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
