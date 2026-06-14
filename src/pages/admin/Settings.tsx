import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, DollarSign, Info } from 'lucide-react';
import { adminApi } from '@/services/admin';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [splitCode, setSplitCode] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSettings();
      const splitSetting = data.find((s: any) => s.key === 'paystack_split_code');
      setSplitCode(splitSetting?.value || '');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings('paystack_split_code', splitCode);
      toast({
        title: 'Saved',
        description: 'Paystack split code updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">System configuration</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-base text-slate-900">Revenue Sharing</CardTitle>
          </div>
          <CardDescription>
            Paystack Split Code for automatic revenue distribution between CMDA chapters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-slate-200 bg-slate-50">
            <Info className="h-4 w-4 text-slate-600" />
            <AlertDescription className="text-sm text-slate-600">
              Create a split in{' '}
              <a
                href="https://dashboard.paystack.com/splits"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
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
              placeholder="SPL_xxxxxxxxxxxxx"
              value={splitCode}
              onChange={(e) => setSplitCode(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              All payments will be split according to this configuration
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
