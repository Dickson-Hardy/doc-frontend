import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Flashlight,
  FlashlightOff,
  Keyboard,
  QrCode,
  RefreshCw,
  Upload,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/services/admin';
import type { CheckInResult, ParticipationCheckIn } from '@/services/admin';
import {
  formatAdminCategory,
  formatAdminDateTime,
  formatAdminNumber,
} from '@/lib/admin-format';

type ScanSource = 'qr' | 'image_upload' | 'manual';

interface ScanResult {
  registrationId: string;
  email: string;
  name: string;
  category: string;
  paymentStatus: string;
  checkedInAt: string;
  alreadyCheckedIn: boolean;
  scanSource: ScanSource;
}

const CHECK_IN_PAGE_SIZE = 25;
const SAME_CODE_COOLDOWN_MS = 5000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const Scanner = () => {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<ParticipationCheckIn[]>([]);
  const [checkInTotal, setCheckInTotal] = useState(0);
  const [checkInPage, setCheckInPage] = useState(1);
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const [manualRegistrationId, setManualRegistrationId] = useState('');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const processingScan = useRef(false);
  const lastScan = useRef({ text: '', at: 0 });
  const audioContext = useRef<AudioContext | null>(null);

  const totalCheckInPages = Math.max(1, Math.ceil(checkInTotal / CHECK_IN_PAGE_SIZE));

  const loadCheckIns = useCallback(async (page: number) => {
    setLoadingCheckIns(true);
    try {
      const response = await adminApi.getParticipationCheckIns(page, CHECK_IN_PAGE_SIZE);
      setCheckIns(response.data);
      setCheckInTotal(response.total);
    } catch (loadError) {
      console.error('Failed to load participation records:', loadError);
    } finally {
      setLoadingCheckIns(false);
    }
  }, []);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();

    return () => {
      codeReader.current?.reset();
      void audioContext.current?.close();
    };
  }, []);

  useEffect(() => {
    void loadCheckIns(checkInPage);
  }, [checkInPage, loadCheckIns]);

  const playFeedback = useCallback(async (kind: 'success' | 'duplicate' | 'error') => {
    if ('vibrate' in navigator) {
      navigator.vibrate(kind === 'success' ? 120 : kind === 'duplicate' ? [80, 60, 80] : [180, 80, 180]);
    }

    try {
      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContext.current ?? new AudioContextClass();
      audioContext.current = context;
      if (context.state === 'suspended') await context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = kind === 'success' ? 880 : kind === 'duplicate' ? 520 : 220;
      gain.gain.setValueAtTime(0.12, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.16);
    } catch {
      // Audio feedback is optional; visual and vibration feedback remain available.
    }
  }, []);

  const stopScanning = useCallback(() => {
    codeReader.current?.reset();
    setScanning(false);
    setTorchAvailable(false);
    setTorchOn(false);
    processingScan.current = false;
  }, []);

  const extractRegistrationId = (rawText: string) => {
    const trimmed = rawText.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.registrationId === 'string' && UUID_PATTERN.test(parsed.registrationId)) {
        return parsed.registrationId;
      }
    } catch {
      if (UUID_PATTERN.test(trimmed)) return trimmed;
    }
    throw new Error('This is not a valid CMDA conference QR code.');
  };

  const showCheckInResult = (
    registrationId: string,
    scanSource: ScanSource,
    checkIn: CheckInResult,
  ) => {
    setResult({
      registrationId,
      email: checkIn.email,
      name: `${checkIn.firstName} ${checkIn.surname}`,
      category: checkIn.category,
      paymentStatus: checkIn.paymentStatus,
      checkedInAt: checkIn.scannedAt,
      alreadyCheckedIn: checkIn.alreadyCheckedIn,
      scanSource,
    });
  };

  const checkInRegistration = useCallback(async (
    registrationId: string,
    scanSource: ScanSource,
  ) => {
    setProcessing(true);
    setError(null);

    try {
      const checkIn = await adminApi.verifyAttendance(registrationId, scanSource);
      showCheckInResult(registrationId, scanSource, checkIn);
      void playFeedback(checkIn.alreadyCheckedIn ? 'duplicate' : 'success');
      setCheckInPage(1);
      void loadCheckIns(1);
      return true;
    } catch (checkInError: any) {
      const message = String(checkInError?.message || 'Check-in failed');
      setResult(null);
      setError(
        message.includes('Only paid registrations')
          ? 'Payment is not confirmed. This participant cannot be checked in.'
          : message,
      );
      void playFeedback('error');
      return false;
    } finally {
      setProcessing(false);
    }
  }, [loadCheckIns, playFeedback]);

  const processScanText = useCallback(async (rawText: string, scanSource: ScanSource) => {
    try {
      const registrationId = extractRegistrationId(rawText);
      await checkInRegistration(registrationId, scanSource);
    } catch (scanError: any) {
      setResult(null);
      setError(scanError?.message || 'Invalid QR code');
      void playFeedback('error');
    }
  }, [checkInRegistration, playFeedback]);

  const inspectTorchCapability = () => {
    const stream = videoRef.current?.srcObject;
    if (!(stream instanceof MediaStream)) return;
    const [track] = stream.getVideoTracks();
    const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    setTorchAvailable(Boolean(capabilities?.torch));
  };

  const startScanning = async () => {
    try {
      setError(null);
      setResult(null);
      processingScan.current = false;
      lastScan.current = { text: '', at: 0 };

      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass && !audioContext.current) {
        audioContext.current = new AudioContextClass();
      }

      if (!codeReader.current || !videoRef.current) {
        throw new Error('Scanner is not ready. Please reload the page.');
      }

      setScanning(true);
      await codeReader.current.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (scanValue) => {
          if (!scanValue || processingScan.current) return;

          const rawText = scanValue.getText();
          const now = Date.now();
          if (
            rawText === lastScan.current.text
            && now - lastScan.current.at < SAME_CODE_COOLDOWN_MS
          ) {
            return;
          }

          lastScan.current = { text: rawText, at: now };
          processingScan.current = true;
          void processScanText(rawText, 'qr').finally(() => {
            window.setTimeout(() => {
              processingScan.current = false;
            }, 900);
          });
        },
      );
      inspectTorchCapability();
    } catch (cameraError: any) {
      const message = cameraError?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser, then try again.'
        : cameraError?.name === 'NotFoundError'
          ? 'No camera was found on this device.'
          : cameraError?.message || 'Failed to start camera.';
      setError(message);
      stopScanning();
    }
  };

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject;
    if (!(stream instanceof MediaStream)) return;
    const [track] = stream.getVideoTracks();
    if (!track) return;

    try {
      const nextTorchState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorchState } as MediaTrackConstraintSet],
      });
      setTorchOn(nextTorchState);
    } catch {
      setError('The flashlight could not be changed on this device.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image containing a CMDA QR code.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The QR image must be smaller than 10 MB.');
      return;
    }

    stopScanning();
    const imageUrl = URL.createObjectURL(file);
    try {
      setError(null);
      setResult(null);
      setProcessing(true);
      const decoded = await codeReader.current?.decodeFromImageUrl(imageUrl);
      if (!decoded) throw new Error('Could not read a QR code from this image.');
      await processScanText(decoded.getText(), 'image_upload');
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Could not read a QR code from this image.');
      void playFeedback('error');
    } finally {
      setProcessing(false);
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleManualCheckIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const registrationId = manualRegistrationId.trim();
    if (!UUID_PATTERN.test(registrationId)) {
      setError('Enter a valid registration ID.');
      return;
    }
    const succeeded = await checkInRegistration(registrationId, 'manual');
    if (succeeded) setManualRegistrationId('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QR Scanner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Continuous one-step check-in for paid participants
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="min-w-0 overflow-hidden border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3 text-base text-slate-900">
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Camera
              </span>
              {scanning && (
                <Badge className="gap-1 bg-emerald-600">
                  <Zap className="h-3 w-3" />
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black sm:aspect-video">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                style={{ display: scanning ? 'block' : 'none' }}
                onLoadedMetadata={inspectTorchCapability}
                muted
                playsInline
                aria-label="Live QR scanner camera preview"
              />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center px-5 text-white">
                  <div className="text-center">
                    <Camera className="mx-auto mb-3 h-12 w-12 opacity-50 sm:h-16 sm:w-16" />
                    <p className="text-sm sm:text-base">Camera preview will appear here</p>
                  </div>
                </div>
              )}
              {scanning && (
                <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {!scanning ? (
                <Button onClick={startScanning} className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Start Continuous Scan
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="w-full">
                  Stop Camera
                </Button>
              )}
              <label className="block min-w-0">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload QR Image
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload an image containing a QR code"
                />
              </label>
            </div>

            {scanning && torchAvailable && (
              <Button type="button" variant="outline" className="w-full" onClick={toggleTorch}>
                {torchOn
                  ? <FlashlightOff className="mr-2 h-4 w-4" />
                  : <Flashlight className="mr-2 h-4 w-4" />}
                {torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
              </Button>
            )}

            <form onSubmit={handleManualCheckIn} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label htmlFor="manual-registration-id" className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Keyboard className="h-4 w-4" />
                Damaged QR? Enter registration ID
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="manual-registration-id"
                  value={manualRegistrationId}
                  onChange={(event) => setManualRegistrationId(event.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="min-w-0 flex-1 font-mono text-xs"
                />
                <Button type="submit" disabled={processing || !manualRegistrationId.trim()}>
                  Check In
                </Button>
              </div>
            </form>

            {error && (
              <Alert variant="destructive" role="alert">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Latest Scan</CardTitle>
          </CardHeader>
          <CardContent>
            <div role="status" aria-live="polite" aria-atomic="true">
              {processing ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-slate-500">
                  <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
                  <p className="font-medium">Validating and checking in…</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <CheckCircle
                      className={`mx-auto mb-2 h-16 w-16 ${
                        result.alreadyCheckedIn ? 'text-amber-500' : 'text-emerald-600'
                      }`}
                    />
                    <p className={`text-lg font-semibold ${
                      result.alreadyCheckedIn ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {result.alreadyCheckedIn ? 'Already Checked In' : 'Participation Recorded'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatAdminDateTime(result.checkedInAt)}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-3 rounded-lg bg-slate-50 p-4">
                    <div>
                      <p className="text-sm text-slate-600">Name</p>
                      <p className="break-words font-semibold text-slate-900">{result.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Email</p>
                      <p className="break-all font-medium text-slate-900">{result.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatAdminCategory(result.category)}</Badge>
                      <Badge>{result.paymentStatus}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Registration ID</p>
                      <p className="break-all font-mono text-xs text-slate-900">
                        {result.registrationId}
                      </p>
                    </div>
                  </div>

                  {scanning && (
                    <p className="text-center text-sm font-medium text-emerald-700">
                      Scanner is ready for the next participant
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center text-slate-500">
                  <QrCode className="mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm">Scan a QR code to check in a participant automatically</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <Users className="h-4 w-4" />
                Participation Records
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {loadingCheckIns
                  ? 'Loading check-ins…'
                  : `${formatAdminNumber(checkInTotal)} participants checked in`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadCheckIns(checkInPage)}
              disabled={loadingCheckIns}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loadingCheckIns ? 'animate-spin' : ''}`} />
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
            <div className="py-10 text-center text-sm text-slate-500">
              No participation has been recorded yet.
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {checkIns.map((checkIn) => (
                  <article key={checkIn.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {checkIn.participant.firstName} {checkIn.participant.surname}
                        </p>
                        <p className="break-all text-xs text-slate-500">{checkIn.participant.email}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-normal">
                        {formatAdminCategory(checkIn.participant.category)}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Checked in</dt>
                        <dd className="font-medium text-slate-700">{formatAdminDateTime(checkIn.scannedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Scanner</dt>
                        <dd className="break-all text-slate-700">
                          {checkIn.scannerEmail || (checkIn.scanSource === 'legacy' ? 'Previous record' : 'Unknown')}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Participant</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Category</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Checked In</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Scanner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkIns.map((checkIn) => (
                      <tr key={checkIn.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-900">
                            {checkIn.participant.firstName} {checkIn.participant.surname}
                          </p>
                          <p className="text-xs text-slate-500">{checkIn.participant.email}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="font-normal">
                            {formatAdminCategory(checkIn.participant.category)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                          {formatAdminDateTime(checkIn.scannedAt)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {checkIn.scannerEmail || (checkIn.scanSource === 'legacy' ? 'Previous record' : 'Unknown')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalCheckInPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Page {checkInPage} of {totalCheckInPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      disabled={checkInPage <= 1 || loadingCheckIns}
                      onClick={() => setCheckInPage((current) => current - 1)}
                      aria-label="Previous participation records page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      disabled={checkInPage >= totalCheckInPages || loadingCheckIns}
                      onClick={() => setCheckInPage((current) => current + 1)}
                      aria-label="Next participation records page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Scanner;
