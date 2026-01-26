import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Key, DollarSign, Info } from 'lucide-react';
import axios from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    publicKey: '',
    secretKey: '',
    splitCode: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/settings/paystack');
      setSettings({
        publicKey: response.data.publicKey || '',
        secretKey: '', // Never show secret key
        splitCode: response.data.splitCode || '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.publicKey || !settings.secretKey) {
      toast({
        title: 'Validation Error',
        description: 'Public key and secret key are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await axios.put('/settings/paystack', settings);
      toast({
        title: 'Success',
        description: 'Paystack settings updated successfully',
      });
      // Clear secret key field after save
      setSettings(prev => ({ ...prev, secretKey: '' }));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage payment gateway and system configuration</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            <CardTitle>Paystack Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure your Paystack API keys for payment processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Get your API keys from{' '}
              <a
                href="https://dashboard.paystack.com/settings/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline font-medium"
              >
                Paystack Dashboard → Settings → API Keys
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publicKey">Public Key</Label>
              <Input
                id="publicKey"
                type="text"
                placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxx"
                value={settings.publicKey}
                onChange={(e) => setSettings({ ...settings, publicKey: e.target.value })}
              />
              <p className="text-sm text-gray-500">
                Used on the frontend to initialize payments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="sk_test_xxxxxxxxxxxxxxxxxxxxx"
                value={settings.secretKey}
                onChange={(e) => setSettings({ ...settings, secretKey: e.target.value })}
              />
              <p className="text-sm text-gray-500">
                Used on the backend to verify payments (encrypted in database)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <CardTitle>Revenue Sharing (Optional)</CardTitle>
          </div>
          <CardDescription>
            Configure Paystack Split Code for automatic revenue distribution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Split codes allow you to automatically split payments between multiple accounts.
              Create one in{' '}
              <a
                href="https://dashboard.paystack.com/splits"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline font-medium"
              >
                Paystack Dashboard → Splits
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="splitCode">Split Code</Label>
            <Input
              id="splitCode"
              type="text"
              placeholder="SPL_xxxxxxxxxxxxx (optional)"
              value={settings.splitCode}
              onChange={(e) => setSettings({ ...settings, splitCode: e.target.value })}
            />
            <p className="text-sm text-gray-500">
              If provided, all payments will be automatically split according to your configuration
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={fetchSettings}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">Security Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-yellow-800">
          <p>• Secret keys are encrypted before being stored in the database</p>
          <p>• Never share your secret key with anyone</p>
          <p>• Use test keys for development and live keys for production</p>
          <p>• Rotate your keys regularly for security</p>
          <p>• Split codes are optional but recommended for revenue sharing</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
