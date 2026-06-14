import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, CheckCircle, XCircle, Upload, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminApi } from '@/services/admin';

interface ScanResult {
  registrationId: string;
  email: string;
  name: string;
  verified: boolean;
}

const Scanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setResult(null);
      setScanning(true);

      const videoInputDevices = await codeReader.current?.listVideoInputDevices();
      if (!videoInputDevices || videoInputDevices.length === 0) {
        throw new Error('No camera found');
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;

      codeReader.current?.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            try {
              const data = JSON.parse(result.getText());
              setResult(data);
              stopScanning();
            } catch (e) {
              setError('Invalid QR code format');
            }
          }
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    codeReader.current?.reset();
    setScanning(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setResult(null);

      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = imageUrl;

      img.onload = async () => {
        try {
          const result = await codeReader.current?.decodeFromImageUrl(imageUrl);
          if (result) {
            const data = JSON.parse(result.getText());
            setResult(data);
          }
        } catch (e) {
          setError('Could not read QR code from image');
        }
      };
    } catch (err) {
      setError('Failed to process image');
    }
  };

  const verifyAttendance = async () => {
    if (!result) return;

    setVerifying(true);
    try {
      await adminApi.verifyAttendance(result.registrationId);
      setResult({ ...result, verified: true });
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QR Scanner</h1>
        <p className="text-sm text-slate-500 mt-1">Scan participant QR codes for check-in</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ display: scanning ? 'block' : 'none' }}
              />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Camera preview will appear here</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!scanning ? (
                <Button onClick={startScanning} className="flex-1">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Scanning
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="flex-1">
                  Stop Scanning
                </Button>
              )}
              <label className="flex-1">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Result Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Scan Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-4">
                  {result.verified ? (
                    <div className="text-center">
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-2" />
                      <p className="text-lg font-semibold text-green-600">
                        Attendance Verified
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-blue-600 mx-auto mb-2" />
                      <p className="text-lg font-semibold text-blue-600">
                        Ready to Verify
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Name</p>
                    <p className="font-medium text-slate-900">{result.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Email</p>
                    <p className="font-medium text-slate-900">{result.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Registration ID</p>
                    <p className="font-mono text-sm text-slate-900">{result.registrationId}</p>
                  </div>
                </div>

                {!result.verified && (
                  <Button
                    onClick={verifyAttendance}
                    disabled={verifying}
                    className="w-full"
                  >
                    {verifying ? 'Verifying...' : 'Verify Attendance'}
                  </Button>
                )}

                <Button
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Scan Another
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Scan a QR code to see participant details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Scanner;
