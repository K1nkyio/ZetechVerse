import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Lock, Palette, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useState, useEffect } from 'react';
import { profileApi } from "@/api/profile.api";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/auth-context";
import { useTranslation } from "react-i18next"; // Fixing import statement for useTranslation

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const { t, i18n } = useTranslation();

  // State for essential settings only
  const [settings, setSettings] = useState({
    // Essential notification settings
    emailNotifications: true,
  });

  // Load settings from user profile
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userData = await profileApi.getCurrentUser();
        // Set initial settings based on user data
        setSettings(prev => ({
          ...prev,
          emailNotifications: userData.email_verified,
          // Add more settings based on user profile
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleAccountSettings = () => {
    navigate('/profile');
  };

  // Handle setting changes
  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Show success message
    toast({
      title: t('settings.updated'),
      description: t('settings.settingUpdated', { setting: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) }),
    });
  };

  // Handle language change
  const handleLanguageChange = (language: string) => {
    localStorage.setItem('zv_language', language);
    i18n.changeLanguage(language);
    handleSettingChange('language', language);
  };

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold">{t('settings.title')}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">{t('settings.description')}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('settings.account')}
              </CardTitle>
              <CardDescription>
                {t('settings.accountDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start h-10 sm:h-auto"
                onClick={handleAccountSettings}
              >
                <User className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">{t('settings.editProfile')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-10 sm:h-auto"
                onClick={() => navigate('/change-password')}
              >
                <Lock className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">{t('settings.changePassword')}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('settings.preferences')}
              </CardTitle>
              <CardDescription>
                {t('settings.preferencesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{t('settings.darkMode')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.darkModeDescription')}</p>
                </div>
                <ThemeToggle />
              </div>
              <Separator />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{t('settings.language')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.languageDescription')}</p>
                </div>
                <Select value={(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">{t('settings.swahili')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('settings.notifications')}
              </CardTitle>
              <CardDescription>
                {t('settings.notificationsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{t('settings.emailNotifications')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.emailNotificationsDescription')}</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                {t('settings.dangerZone')}
              </CardTitle>
              <CardDescription>
                {t('settings.dangerZoneDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <LogoutButton 
                variant="outline" 
                size="sm"
                showText={true}
                className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-10 sm:h-auto"
              />
              <Button 
                variant="outline" 
                className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10 hover:text-destruct h-10 sm:h-auto"
                onClick={() => {
                  if (window.confirm(t('settings.deleteAccountConfirm'))) {
                    // Handle account deletion
                    toast({
                      title: t('settings.accountDeletion'),
                      description: t('settings.accountDeletionNotImplemented'),
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">{t('settings.deleteAccount')}</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6 sm:my-8" />

        <div className="text-center text-sm text-muted-foreground px-4">
          <p className="text-xs sm:text-sm">{t('settings.needHelp')}</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
