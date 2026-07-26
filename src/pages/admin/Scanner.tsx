import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, CheckCircle, RefreshCw, Upload, Users, XCircle, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminApi } from '@/services/admin';
import type { ParticipationCheckIn } from '@/services/admin';
import {
  formatAdminCategory,
  formatAdminDateTime,
  formatAdminNumber,
} from '@/lib/admin-format';

interface ScanResult {
  registrationId: string;
  email: string;
  name: string;
  category: string;
  paymentStatus: string;
  verified: boolean;
  checkedInAt?: string;
  alreadyCheckedIn?: boolean;
  scanSource: 'qr' | 'image_upload';
}

const Scanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [checkIns, setCheckIns] = useState<ParticipationCheckIn[]>([]);
  const [checkInTotal, setCheckInTotal] = useState(0);
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const processingScan = useRef(false);

  const loadCheckIns = useCallback(async () => {
    setLoadingCheckIns(true);
    try {
      const response = await adminApi.getParticipationCheckIns();
      setCheckIns(response.data);
      setCheckInTotal(response.total);
    } catch (err) {
      console.error('Failed to load participation records:', err);
    } finally {
      setLoadingCheckIns(false);
    }
  }, []);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    void loadCheckIns();

    return () => {
      codeReader.current?.reset();
    };
  }, [loadCheckIns]);

  const stopScanning = () => {
    codeReader.current?.reset();
    setScanning(false);
  };

  const processScanText = async (
    rawText: string,
    scanSource: 'qr' | 'image_upload',
  ) => {
    stopScanning();
    setError(null);
    setResult(null);

    try {
      const scannedData = JSON.parse(rawText);
      if (typeof scannedData.registrationId !== 'string' || !scannedData.registrationId) {
        throw new Error('Invalid conference QR code');
      }

      const registration = await adminApi.getRegistration(scannedData.registrationId);
      const isPaid = registration.paymentStatus === 'paid';

      setResult({
        registrationId: registration.id,
        email: registration.email,
        name: `${registration.firstName} ${registration.surname}`,
        category: registration.category,
        paymentStatus: registration.paymentStatus,
        verified: Boolean(registration.attendanceVerified),
        checkedInAt: registration.verifiedAt || undefined,
        alreadyCheckedIn: Boolean(registration.attendanceVerified),
        scanSource,
      });

      if (!isPaid) {
        setError('This registration has not been paid and cannot be checked in.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid QR code or registration not found');
    }
  };

  const startScanning = async () => {
    try {
      setError(null);
      setResult(null);
      processingScan.current = false;
      setScanning(true);

      const videoInputDevices = await codeReader.current?.listVideoInputDevices();
      if (!videoInputDevices || videoInputDevices.length === 0) {
        throw new Error('No camera found');
      }

      codeReader.current?.decodeFromVideoDevice(
        videoInputDevices[0].deviceId,
        videoRef.current!,
        (scanResult) => {
          if (scanResult && !processingScan.current) {
            processingScan.current = true;
            void processScanText(scanResult.getText(), 'qr').finally(() => {
              processingScan.current = false;
            });
          }
        },
      );
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    try {
      setError(null);
      setResult(null);
      const decoded = await codeReader.current?.decodeFromImageUrl(imageUrl);
      if (!decoded) throw new Error('Could not read QR code from image');
      await processScanText(decoded.getText(), 'image_upload');
    } catch (err: any) {
      setError(err.message || 'Could not read QR code from image');
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const verifyAttendance = async () => {
    if (!result) return;

    setVerifying(true);
    setError(null);
    try {
      const checkIn = await adminApi.verifyAttendance(
        result.registrationId,
        result.scanSource,
      );
      setResult((current) => current ? {
        ...current,
        verified: true,
        checkedInAt: checkIn.scannedAt,
        alreadyCheckedIn: checkIn.alreadyCheckedIn,
      } : current);
      await loadCheckIns();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QR Scanner</h1>
        <p className="text-sm text-slate-500 mt-1">
          Scan participant QR codes and keep a participation record
        </p>
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
                        {result.alreadyCheckedIn ? 'Already Checked In' : 'Participation Recorded'}
                      </p>
                      {result.checkedInAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          {formatAdminDateTime(result.checkedInAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-blue-600 mx-auto mb-2" />
                      <p className="text-lg font-semibold text-blue-600">Ready to Check In</p>
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
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{formatAdminCategory(result.category)}</Badge>
                    <Badge variant={result.paymentStatus === 'paid' ? 'default' : 'destructive'}>
                      {result.paymentStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Registration ID</p>
                    <p className="font-mono text-sm text-slate-900 break-all">
                      {result.registrationId}
                    </p>
                  </div>
                </div>

                {!result.verified && result.paymentStatus === 'paid' && (
                  <Button
                    onClick={verifyAttendance}
                    disabled={verifying}
                    className="w-full"
                  >
                    {verifying ? 'Recording...' : 'Mark Participation'}
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

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participation Records
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {loadingCheckIns
                  ? 'Loading check-ins...'
                  : `${formatAdminNumber(checkInTotal)} participants checked in`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCheckIns}
              disabled={loadingCheckIns}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingCheckIns ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCheckIns ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            </div>
          ) : checkIns.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-500">
              No participation has been recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Participant</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Category</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Checked In</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Scanner</th>
                  </tr>
                </thead>
                <tbody>
                  {checkIns.map((checkIn) => (
                    <tr key={checkIn.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-900">
                          {checkIn.participant.firstName} {checkIn.participant.surname}
                        </p>
                        <p className="text-xs text-slate-500">{checkIn.participant.email}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="font-normal">
                          {formatAdminCategory(checkIn.participant.category)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatAdminDateTime(checkIn.scannedAt)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {checkIn.scannerEmail || (checkIn.scanSource === 'legacy' ? 'Previous record' : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Scanner;
