import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import {
  BarChart3,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Flashlight,
  FlashlightOff,
  Keyboard,
  QrCode,
  RefreshCw,
  Search,
  Upload,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminApi } from '@/services/admin';
import type { CheckInResult, ParticipationCheckIn } from '@/services/admin';
import { scannerApi } from '@/services/scanner';
import {
  formatAdminCategory,
  formatAdminDateTime,
  formatAdminNumber,
} from '@/lib/admin-format';

type ScanSource = 'qr' | 'image_upload' | 'manual';
type AttendeeType = 'primary' | 'spouse';

interface ScannerProps {
  accessMode?: boolean;
  onSessionInvalid?: () => void;
}

interface ScanResult {
  registrationId: string;
  email: string;
  name: string;
  category: string;
  paymentStatus: string;
  checkedInAt: string;
  alreadyCheckedIn: boolean;
  attendeeType: AttendeeType;
  scanSource: ScanSource;
}

interface PendingAttendeeChoice {
  registrationId: string;
  scanSource: ScanSource;
}

interface ParticipationFilters {
  search: string;
  category: string;
  attendeeType: string;
  scanSource: string;
  scanner: string;
  dateFrom: string;
  dateTo: string;
}

const CHECK_IN_PAGE_SIZE = 25;
const SAME_CODE_COOLDOWN_MS = 5000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_PARTICIPATION_FILTERS: ParticipationFilters = {
  search: '',
  category: 'all',
  attendeeType: 'all',
  scanSource: 'all',
  scanner: 'all',
  dateFrom: '',
  dateTo: '',
};

const formatAttendeeType = (attendeeType: ParticipationCheckIn['attendeeType']) => (
  attendeeType === 'spouse' ? 'Spouse' : 'Primary registrant'
);

const formatScanSource = (source: ParticipationCheckIn['scanSource']) => {
  const labels: Record<ParticipationCheckIn['scanSource'], string> = {
    qr: 'Camera QR',
    image_upload: 'QR image',
    manual: 'Manual ID',
    legacy: 'Previous record',
  };
  return labels[source];
};

const getScannerLabel = (checkIn: ParticipationCheckIn) => (
  checkIn.scannerName
  || checkIn.scannerEmail
  || (checkIn.scanSource === 'legacy' ? 'Previous record' : 'Unknown')
);

const csvCell = (value: string | number) => {
  const text = String(value);
  const safeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const Scanner = ({ accessMode = false, onSessionInvalid }: ScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [popupResult, setPopupResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<ParticipationCheckIn[]>([]);
  const [checkInTotal, setCheckInTotal] = useState(0);
  const [checkInPage, setCheckInPage] = useState(1);
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const [checkInLoadError, setCheckInLoadError] = useState<string | null>(null);
  const [participationFilters, setParticipationFilters] = useState<ParticipationFilters>(
    EMPTY_PARTICIPATION_FILTERS,
  );
  const [manualRegistrationId, setManualRegistrationId] = useState('');
  const [pendingAttendeeChoice, setPendingAttendeeChoice] = useState<PendingAttendeeChoice | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const processingScan = useRef(false);
  const lastScan = useRef({ text: '', at: 0 });
  const audioContext = useRef<AudioContext | null>(null);

  const updateParticipationFilter = (
    key: keyof ParticipationFilters,
    value: string,
  ) => {
    setParticipationFilters((current) => ({ ...current, [key]: value }));
  };

  const loadCheckIns = useCallback(async (page: number) => {
    setLoadingCheckIns(true);
    setCheckInLoadError(null);
    try {
      const response = accessMode
        ? await scannerApi.getParticipationCheckIns(page, CHECK_IN_PAGE_SIZE)
        : await adminApi.getAllParticipationCheckIns();
      setCheckIns(response.data);
      setCheckInTotal(response.total);
    } catch (loadError) {
      console.error(
        'Failed to load participation records:',
        JSON.stringify(loadError),
        loadError,
      );
      const message = String((loadError as { message?: string })?.message || '');
      if (accessMode && /scanner (session|access)/i.test(message)) {
        onSessionInvalid?.();
      }
      setCheckInLoadError(
        /permission denied|jwt|session/i.test(message)
          ? 'Your admin session has expired. Sign in again to load participation records.'
          : 'Participation records could not be loaded. Refresh and try again.',
      );
    } finally {
      setLoadingCheckIns(false);
    }
  }, [accessMode, onSessionInvalid]);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();

    return () => {
      codeReader.current?.reset();
      void audioContext.current?.close();
    };
  }, []);

  useEffect(() => {
    if (accessMode) void loadCheckIns(checkInPage);
  }, [accessMode, checkInPage, loadCheckIns]);

  useEffect(() => {
    if (!accessMode) void loadCheckIns(1);
  }, [accessMode, loadCheckIns]);

  useEffect(() => {
    if (!popupResult) return;
    const timeout = window.setTimeout(() => setPopupResult(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [popupResult]);

  const scannerOptions = useMemo(() => (
    Array.from(new Set(checkIns.map(getScannerLabel))).sort((left, right) => left.localeCompare(right))
  ), [checkIns]);

  const categoryOptions = useMemo(() => (
    Array.from(new Set(checkIns.map((checkIn) => checkIn.participant.category)))
      .sort((left, right) => formatAdminCategory(left).localeCompare(formatAdminCategory(right)))
  ), [checkIns]);

  const filteredCheckIns = useMemo(() => {
    if (accessMode) return checkIns;

    const normalizedSearch = participationFilters.search.trim().toLowerCase();
    const fromTime = participationFilters.dateFrom
      ? new Date(`${participationFilters.dateFrom}T00:00:00`).getTime()
      : null;
    const toTime = participationFilters.dateTo
      ? new Date(`${participationFilters.dateTo}T23:59:59.999`).getTime()
      : null;

    return checkIns.filter((checkIn) => {
      const participantName = `${checkIn.participant.firstName} ${checkIn.participant.surname}`;
      const scannerLabel = getScannerLabel(checkIn);
      const scannedTime = new Date(checkIn.scannedAt).getTime();
      const matchesSearch = !normalizedSearch || [
        participantName,
        checkIn.participant.email,
        checkIn.registrationId,
        scannerLabel,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesSearch
        && (
          participationFilters.category === 'all'
          || checkIn.participant.category === participationFilters.category
        )
        && (
          participationFilters.attendeeType === 'all'
          || checkIn.attendeeType === participationFilters.attendeeType
        )
        && (
          participationFilters.scanSource === 'all'
          || checkIn.scanSource === participationFilters.scanSource
        )
        && (
          participationFilters.scanner === 'all'
          || scannerLabel === participationFilters.scanner
        )
        && (fromTime === null || scannedTime >= fromTime)
        && (toTime === null || scannedTime <= toTime);
    });
  }, [accessMode, checkIns, participationFilters]);

  const displayedCheckInTotal = accessMode ? checkInTotal : filteredCheckIns.length;
  const totalCheckInPages = Math.max(
    1,
    Math.ceil(displayedCheckInTotal / CHECK_IN_PAGE_SIZE),
  );
  const visibleCheckIns = accessMode
    ? checkIns
    : filteredCheckIns.slice(
        (checkInPage - 1) * CHECK_IN_PAGE_SIZE,
        checkInPage * CHECK_IN_PAGE_SIZE,
      );
  const filtersActive = Object.entries(participationFilters).some(([key, value]) => (
    key === 'search' || key === 'dateFrom' || key === 'dateTo'
      ? value !== ''
      : value !== 'all'
  ));

  const participationReport = useMemo(() => {
    const categories = new Map<string, number>();
    const sources = new Map<string, number>();
    const scanners = new Map<string, number>();
    let primary = 0;
    let spouses = 0;

    filteredCheckIns.forEach((checkIn) => {
      categories.set(
        checkIn.participant.category,
        (categories.get(checkIn.participant.category) || 0) + 1,
      );
      sources.set(checkIn.scanSource, (sources.get(checkIn.scanSource) || 0) + 1);
      const scanner = getScannerLabel(checkIn);
      scanners.set(scanner, (scanners.get(scanner) || 0) + 1);
      if (checkIn.attendeeType === 'spouse') spouses += 1;
      else primary += 1;
    });

    return {
      primary,
      spouses,
      categories: Array.from(categories.entries()).sort((left, right) => right[1] - left[1]),
      sources: Array.from(sources.entries()).sort((left, right) => right[1] - left[1]),
      scanners: Array.from(scanners.entries()).sort((left, right) => right[1] - left[1]),
    };
  }, [filteredCheckIns]);

  useEffect(() => {
    if (!accessMode) setCheckInPage(1);
  }, [accessMode, participationFilters]);

  useEffect(() => {
    if (checkInPage > totalCheckInPages) setCheckInPage(totalCheckInPages);
  }, [checkInPage, totalCheckInPages]);

  const exportFilteredCheckIns = () => {
    const rows: Array<Array<string | number>> = [[
      'Registration ID',
      'Participant',
      'Email',
      'Attendee type',
      'Registration category',
      'Checked in at',
      'Scanner name',
      'Scanner email',
      'Scan source',
    ]];
    filteredCheckIns.forEach((checkIn) => {
      rows.push([
        checkIn.registrationId,
        `${checkIn.participant.firstName} ${checkIn.participant.surname}`.trim(),
        checkIn.participant.email,
        formatAttendeeType(checkIn.attendeeType),
        formatAdminCategory(checkIn.participant.category),
        new Date(checkIn.scannedAt).toISOString(),
        checkIn.scannerName || '',
        checkIn.scannerEmail || '',
        formatScanSource(checkIn.scanSource),
      ]);
    });
    downloadCsv(
      `cmda-filtered-check-ins-${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  };

  const exportParticipationReport = () => {
    const rows: Array<Array<string | number>> = [
      ['CMDA participation report', 'Value'],
      ['Generated at', new Date().toISOString()],
      ['Filtered check-ins', filteredCheckIns.length],
      ['Primary registrants', participationReport.primary],
      ['Spouses', participationReport.spouses],
      ['', ''],
      ['Category breakdown', 'Check-ins'],
      ...participationReport.categories.map(([category, count]) => [
        formatAdminCategory(category),
        count,
      ]),
      ['', ''],
      ['Scan source breakdown', 'Check-ins'],
      ...participationReport.sources.map(([source, count]) => [
        formatScanSource(source as ParticipationCheckIn['scanSource']),
        count,
      ]),
      ['', ''],
      ['Scanner breakdown', 'Check-ins'],
      ...participationReport.scanners,
    ];
    downloadCsv(
      `cmda-participation-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  };

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

  const extractRegistrationPass = (rawText: string): {
    registrationId: string;
    attendeeType?: AttendeeType;
  } => {
    const trimmed = rawText.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.registrationId === 'string' && UUID_PATTERN.test(parsed.registrationId)) {
        const attendeeType = parsed.attendeeType === 'primary' || parsed.attendeeType === 'spouse'
          ? parsed.attendeeType
          : undefined;
        return { registrationId: parsed.registrationId, attendeeType };
      }
    } catch {
      if (UUID_PATTERN.test(trimmed)) return { registrationId: trimmed };
    }
    throw new Error('This is not a valid CMDA conference QR code.');
  };

  const showCheckInResult = (
    registrationId: string,
    scanSource: ScanSource,
    checkIn: CheckInResult,
  ) => {
    const nextResult = {
      registrationId,
      email: checkIn.email,
      name: `${checkIn.firstName} ${checkIn.surname}`,
      category: checkIn.category,
      paymentStatus: checkIn.paymentStatus,
      checkedInAt: checkIn.scannedAt,
      alreadyCheckedIn: checkIn.alreadyCheckedIn,
      attendeeType: checkIn.attendeeType,
      scanSource,
    };
    setResult(nextResult);
    setPopupResult(nextResult);
  };

  const checkInRegistration = useCallback(async (
    registrationId: string,
    scanSource: ScanSource,
    attendeeType?: AttendeeType,
  ) => {
    setProcessing(true);
    setError(null);

    try {
      const checkIn = accessMode
        ? await scannerApi.verifyAttendance(registrationId, scanSource, attendeeType)
        : await adminApi.verifyAttendance(registrationId, scanSource, attendeeType);
      showCheckInResult(registrationId, scanSource, checkIn);
      void playFeedback(checkIn.alreadyCheckedIn ? 'duplicate' : 'success');
      setCheckInPage(1);
      void loadCheckIns(1);
      return true;
    } catch (checkInError: any) {
      const message = String(checkInError?.message || 'Check-in failed');
      if (accessMode && /scanner (session|access)/i.test(message)) {
        onSessionInvalid?.();
      }
      if (/Attendee choice required/i.test(message)) {
        setPendingAttendeeChoice({ registrationId, scanSource });
        return false;
      }
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
  }, [accessMode, loadCheckIns, onSessionInvalid, playFeedback]);

  const processScanText = useCallback(async (rawText: string, scanSource: ScanSource) => {
    try {
      const pass = extractRegistrationPass(rawText);
      await checkInRegistration(pass.registrationId, scanSource, pass.attendeeType);
    } catch (scanError: any) {
      setResult(null);
      setError(scanError?.message || 'Invalid QR code');
      void playFeedback('error');
    }
  }, [checkInRegistration, playFeedback]);

  const chooseAttendee = async (attendeeType: AttendeeType) => {
    const choice = pendingAttendeeChoice;
    if (!choice) return;
    setPendingAttendeeChoice(null);
    await checkInRegistration(choice.registrationId, choice.scanSource, attendeeType);
  };

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
      <Dialog
        open={Boolean(pendingAttendeeChoice)}
        onOpenChange={(open) => {
          if (!open && !processing) setPendingAttendeeChoice(null);
        }}
      >
        <DialogContent
          data-testid="attendee-choice-dialog"
          className="w-[calc(100%-1.5rem)] max-w-md rounded-xl"
        >
          <DialogHeader>
            <DialogTitle>Who is checking in?</DialogTitle>
            <DialogDescription>
              This booking includes a doctor and spouse. Select the person standing at the desk.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <Button
              type="button"
              className="h-auto min-h-20 flex-col gap-1 py-4 text-base"
              disabled={processing}
              onClick={() => void chooseAttendee('primary')}
            >
              <span>Check in Doctor</span>
              <span className="text-xs font-normal opacity-80">Primary registrant</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-auto min-h-20 flex-col gap-1 py-4 text-base"
              disabled={processing}
              onClick={() => void chooseAttendee('spouse')}
            >
              <span>Check in Spouse</span>
              <span className="text-xs font-normal opacity-80">Linked participant</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {popupResult ? (
        <div
          data-testid="check-in-popup"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          className={`fixed inset-x-3 top-3 z-50 overflow-hidden rounded-xl border shadow-2xl sm:left-auto sm:right-5 sm:w-[420px] ${
            popupResult.alreadyCheckedIn
              ? 'border-amber-300 bg-amber-50'
              : 'border-emerald-300 bg-emerald-50'
          }`}
        >
          <div className="flex items-start gap-3 p-4">
            <CheckCircle
              className={`mt-0.5 h-9 w-9 shrink-0 ${
                popupResult.alreadyCheckedIn ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className={`font-bold ${
                popupResult.alreadyCheckedIn ? 'text-amber-900' : 'text-emerald-900'
              }`}>
                {popupResult.alreadyCheckedIn ? 'Already checked in' : 'Check-in successful'}
              </p>
              <p className="mt-0.5 break-words text-base font-semibold text-slate-900">
                {popupResult.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-white/70">
                  {popupResult.attendeeType === 'spouse'
                    ? 'Spouse'
                    : formatAdminCategory(popupResult.category)}
                </Badge>
                <span className="text-xs text-slate-600">
                  {formatAdminDateTime(popupResult.checkedInAt)}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-600">
                Scanner is ready for the next participant.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPopupResult(null)}
              className="rounded-md p-1 text-slate-500 hover:bg-black/5 hover:text-slate-800"
              aria-label="Dismiss check-in popup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className={`h-1 w-full ${
              popupResult.alreadyCheckedIn ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </div>
      ) : null}

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
                      <Badge variant="outline">
                        {result.attendeeType === 'spouse' ? 'Spouse' : 'Primary registrant'}
                      </Badge>
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

      {!accessMode ? (
        <Card className="min-w-0 border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <BarChart3 className="h-4 w-4" />
                  Participation Report
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Live summary of the records matching the filters below
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingCheckIns || Boolean(checkInLoadError) || filteredCheckIns.length === 0}
                  onClick={exportParticipationReport}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Export Report
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={loadingCheckIns || Boolean(checkInLoadError) || filteredCheckIns.length === 0}
                  onClick={exportFilteredCheckIns}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Export Filtered Records
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkInLoadError ? (
              <Alert variant="destructive" role="alert">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{checkInLoadError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Check-ins</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatAdminNumber(filteredCheckIns.length)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Primary</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatAdminNumber(participationReport.primary)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Spouses</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatAdminNumber(participationReport.spouses)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scanners</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatAdminNumber(participationReport.scanners.length)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">By category</h3>
                <div className="mt-3 space-y-2">
                  {participationReport.categories.length === 0 ? (
                    <p className="text-sm text-slate-500">No matching records</p>
                  ) : participationReport.categories.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">
                        {formatAdminCategory(category)}
                      </span>
                      <span className="font-semibold text-slate-900">{formatAdminNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">By scan method</h3>
                <div className="mt-3 space-y-2">
                  {participationReport.sources.length === 0 ? (
                    <p className="text-sm text-slate-500">No matching records</p>
                  ) : participationReport.sources.map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">
                        {formatScanSource(source as ParticipationCheckIn['scanSource'])}
                      </span>
                      <span className="font-semibold text-slate-900">{formatAdminNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">By scanner</h3>
                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">
                  {participationReport.scanners.length === 0 ? (
                    <p className="text-sm text-slate-500">No matching records</p>
                  ) : participationReport.scanners.map(([scanner, count]) => (
                    <div key={scanner} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{scanner}</span>
                      <span className="font-semibold text-slate-900">{formatAdminNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
                  : checkInLoadError
                    ? 'Participation records unavailable'
                    : filtersActive && !accessMode
                      ? `${formatAdminNumber(displayedCheckInTotal)} of ${formatAdminNumber(checkInTotal)} check-ins match`
                      : `${formatAdminNumber(displayedCheckInTotal)} participants checked in`}
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
          {!accessMode ? (
            <div className="mb-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Filter participation records</p>
                  <p className="text-xs text-slate-500">
                    The report, table, and exports update together.
                  </p>
                </div>
                {filtersActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setParticipationFilters(EMPTY_PARTICIPATION_FILTERS)}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="relative md:col-span-2">
                  <span className="sr-only">Search participation records</span>
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    value={participationFilters.search}
                    onChange={(event) => updateParticipationFilter('search', event.target.value)}
                    placeholder="Search participant, email, registration ID, or scanner"
                    className="bg-white pl-9"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Category</span>
                  <select
                    value={participationFilters.category}
                    onChange={(event) => updateParticipationFilter('category', event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  >
                    <option value="all">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {formatAdminCategory(category)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Attendee</span>
                  <select
                    value={participationFilters.attendeeType}
                    onChange={(event) => updateParticipationFilter('attendeeType', event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  >
                    <option value="all">Doctor and spouse</option>
                    <option value="primary">Primary registrants</option>
                    <option value="spouse">Spouses</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Scan method</span>
                  <select
                    value={participationFilters.scanSource}
                    onChange={(event) => updateParticipationFilter('scanSource', event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  >
                    <option value="all">All scan methods</option>
                    <option value="qr">Camera QR</option>
                    <option value="image_upload">QR image</option>
                    <option value="manual">Manual ID</option>
                    <option value="legacy">Previous records</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Scanner</span>
                  <select
                    value={participationFilters.scanner}
                    onChange={(event) => updateParticipationFilter('scanner', event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  >
                    <option value="all">All scanners</option>
                    {scannerOptions.map((scanner) => (
                      <option key={scanner} value={scanner}>{scanner}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">From date</span>
                  <Input
                    type="date"
                    value={participationFilters.dateFrom}
                    onChange={(event) => updateParticipationFilter('dateFrom', event.target.value)}
                    className="bg-white"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">To date</span>
                  <Input
                    type="date"
                    value={participationFilters.dateTo}
                    min={participationFilters.dateFrom || undefined}
                    onChange={(event) => updateParticipationFilter('dateTo', event.target.value)}
                    className="bg-white"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {checkInLoadError ? (
            <Alert variant="destructive" role="alert">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{checkInLoadError}</AlertDescription>
            </Alert>
          ) : loadingCheckIns ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            </div>
          ) : visibleCheckIns.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              {filtersActive
                ? 'No participation records match the selected filters.'
                : 'No participation has been recorded yet.'}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {visibleCheckIns.map((checkIn) => (
                  <article key={checkIn.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {checkIn.participant.firstName} {checkIn.participant.surname}
                        </p>
                        <p className="break-all text-xs text-slate-500">{checkIn.participant.email}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-normal">
                        {checkIn.attendeeType === 'spouse'
                          ? 'Spouse'
                          : formatAdminCategory(checkIn.participant.category)}
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
                          {checkIn.scannerName
                            || checkIn.scannerEmail
                            || (checkIn.scanSource === 'legacy' ? 'Previous record' : 'Unknown')}
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
                    {visibleCheckIns.map((checkIn) => (
                      <tr key={checkIn.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-900">
                            {checkIn.participant.firstName} {checkIn.participant.surname}
                          </p>
                          <p className="text-xs text-slate-500">{checkIn.participant.email}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="font-normal">
                            {checkIn.attendeeType === 'spouse'
                              ? 'Spouse'
                              : formatAdminCategory(checkIn.participant.category)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                          {formatAdminDateTime(checkIn.scannedAt)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {checkIn.scannerName
                            || checkIn.scannerEmail
                            || (checkIn.scanSource === 'legacy' ? 'Previous record' : 'Unknown')}
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
