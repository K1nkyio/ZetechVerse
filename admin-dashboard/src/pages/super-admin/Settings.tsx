import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Bell, Shield, Palette, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminSettings() {
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    siteName: "ZetechVerse",
    siteUrl: "https://zetechverse.com",
    description: "Explore the world of technology and innovation",
    emailNewPosts: true,
    emailCommentModeration: true,
    emailNewUsers: false,
    requirePostApproval: true,
    commentModeration: true,
    requireTwoFactor: false,
    fromEmail: "noreply@zetechverse.com",
    fromName: "ZetechVerse",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("superadmin_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Failed to load saved settings:", e);
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("superadmin_settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }

    toast({
      title: "Settings Saved",
      description: "Your settings have been updated successfully.",
    });
  };

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage platform settings and preferences</p>
        </div>

        {/* General Settings */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              General Settings
            </CardTitle>
            <CardDescription>Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Site Description</Label>
              <Input
                id="description"
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="h-5 w-5 text-accent" />
              Notifications
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email notifications for new posts</p>
                <p className="text-sm text-muted-foreground">Get notified when admins submit posts for review</p>
              </div>
              <Switch
                checked={settings.emailNewPosts}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNewPosts: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Comment moderation alerts</p>
                <p className="text-sm text-muted-foreground">Receive alerts for flagged comments</p>
              </div>
              <Switch
                checked={settings.emailCommentModeration}
                onCheckedChange={(checked) => setSettings({ ...settings, emailCommentModeration: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New user registration</p>
                <p className="text-sm text-muted-foreground">Get notified when new users register</p>
              </div>
              <Switch
                checked={settings.emailNewUsers}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNewUsers: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              Security
            </CardTitle>
            <CardDescription>Security and access control settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require post approval</p>
                <p className="text-sm text-muted-foreground">All admin posts must be approved before publishing</p>
              </div>
              <Switch
                checked={settings.requirePostApproval}
                onCheckedChange={(checked) => setSettings({ ...settings, requirePostApproval: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Comment moderation</p>
                <p className="text-sm text-muted-foreground">New comments require approval before display</p>
              </div>
              <Switch
                checked={settings.commentModeration}
                onCheckedChange={(checked) => setSettings({ ...settings, commentModeration: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-factor authentication</p>
                <p className="text-sm text-muted-foreground">Require 2FA for all admin accounts</p>
              </div>
              <Switch
                checked={settings.requireTwoFactor}
                onCheckedChange={(checked) => setSettings({ ...settings, requireTwoFactor: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Mail className="h-5 w-5 text-warning" />
              Email Configuration
            </CardTitle>
            <CardDescription>Configure email sending settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  value={settings.fromEmail}
                  onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={settings.fromName}
                  onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
