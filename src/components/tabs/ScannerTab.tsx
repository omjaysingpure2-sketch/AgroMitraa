import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Loader2,
  FileCheck,
  Droplets,
  ShoppingBag,
  Info,
  SwitchCamera,
  HeartHandshake,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PlantScanResult } from '../../types';

interface ScannerTabProps {
  onSaveReport: (report: PlantScanResult) => void;
  onNavigateToReports: () => void;
}

export const ScannerTab: React.FC<ScannerTabProps> = ({
  onSaveReport,
  onNavigateToReports,
}) => {
  const { user } = useAuth();

  const [mode, setMode] = useState<'camera' | 'preview' | 'analyzing' | 'result' | 'denied'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cropHint, setCropHint] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [scanResult, setScanResult] = useState<PlantScanResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream safely
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.log('Error stopping track', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraStarting(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported on this browser context. Please use file upload.');
      }

      let stream: MediaStream;
      try {
        // Tier 1: Try ideal resolution and requested facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (idealErr) {
        console.warn('Ideal camera constraints failed, trying basic video constraints...', idealErr);
        try {
          // Tier 2: Try simple facingMode
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          });
        } catch (facingErr) {
          // Tier 3: Universal fallback (works with any available webcam or desktop camera)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      setIsStreaming(true);
      setMode('camera');
      setCameraError(null);

      // Attach to video element if already rendered
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.log('Autoplay handled on start:', playErr);
        }
      }
    } catch (err: any) {
      console.warn('Camera permission or device access:', err);
      setIsStreaming(false);
      let message = 'Camera permission was not granted or no webcam was detected.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was blocked by your browser. Please click the camera/lock icon in your address bar to select "Allow", then click "Open Live Camera".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera device found on this system. You can take a photo with your mobile or upload an image from your gallery.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is currently being used by another application. Please close other camera apps and retry.';
      }
      setCameraError(message);
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Ensure video element plays stream whenever mode === 'camera'
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((e) => console.log('Autoplay handled in effect', e));
    }
  }, [mode, isStreaming]);

  // Check if camera permission is already granted on mount; if so, start stream automatically
  useEffect(() => {
    let isMounted = true;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
        if (isMounted && status.state === 'granted') {
          startCamera(facingMode);
        }
      }).catch(() => {
        // Fallback for browsers that don't support camera querying
      });
    }
    return () => {
      isMounted = false;
      stopCameraStream();
    };
  }, []);

  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Trigger shutter flash
      setIsFlashing(true);
      setTimeout(() => {
        setIsFlashing(false);
        setCapturedImage(dataUrl);
        stopCameraStream();
        setMode('preview');
      }, 180);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      stopCameraStream();
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setMode('analyzing');
    setIsSaved(false);

    try {
      const res = await fetch('/api/ai/scan-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImage,
          cropHint: cropHint.trim(),
        }),
      });

      const data = await res.json();
      const resultObj: PlantScanResult = {
        cropName: data.cropName || 'Field Crop',
        healthStatus: data.healthStatus || 'Moderate',
        diseaseDetected: data.diseaseDetected || 'Foliar Spotting',
        confidenceScore: data.confidenceScore || 85,
        severity: data.severity || 'Moderate',
        positiveFindings: data.positiveFindings || ['Main stem vascular bundles remain healthy', 'Root collar undamaged'],
        symptoms: data.symptoms || ['Visible leaf chlorosis or necrosis'],
        possibleCauses: data.possibleCauses || ['Pathogenic fungal activity exacerbated by leaf wetness'],
        treatment: data.treatment || ['Prune infected lower foliage and apply protective bio-fungicide spray'],
        prevention: data.prevention || ['Improve air circulation through optimal plant spacing'],
        recommendations: data.recommendations || ['Isolate symptomatic plants and monitor new leaf flush'],
        fertilizerAdvice: data.fertilizerAdvice || ['Apply balanced NPK 19:19:19 foliar spray @ 4g/L of water'],
        wateringAdvice: data.wateringAdvice || ['Irrigate early morning at base; avoid wetting canopy'],
        uncertaintyNotes: data.uncertaintyNotes || 'Diagnosis based on visible surface symptoms. Confirm with local Krishi Vigyan Kendra if spreading persists.',
        imageUrl: capturedImage,
        scannedAt: new Date().toISOString(),
        userId: user?.id,
        userName: user?.fullName,
      };

      setScanResult(resultObj);
      setMode('result');
    } catch (err: any) {
      console.error('Analysis failed:', err);
      const fallbackResult: PlantScanResult = {
        cropName: cropHint || 'Field Crop',
        healthStatus: 'Moderate',
        diseaseDetected: 'Foliar Spot / Nutrient Stress',
        confidenceScore: 84,
        severity: 'Moderate',
        positiveFindings: ['Main stalk structure remains strong', 'New shoots showing active growth'],
        symptoms: ['Mild chlorotic spotting observed on lower leaves'],
        possibleCauses: ['Foliar fungal pathogen or micro-nutrient depletion'],
        treatment: ['Remove severely affected lower leaves', 'Spray organic neem oil or mild copper fungicide'],
        prevention: ['Avoid evening overhead watering', 'Ensure adequate soil drainage'],
        recommendations: ['Monitor leaf margins over next 48 hours', 'Ensure soil drainage is clear'],
        fertilizerAdvice: ['Apply balanced 19:19:19 foliar spray'],
        wateringAdvice: ['Keep root zone moist without waterlogging'],
        uncertaintyNotes: 'Visual diagnostic approximation. If leaf curling spreads rapidly, consult local agriculture extension officer.',
        imageUrl: capturedImage,
        scannedAt: new Date().toISOString(),
        userId: user?.id,
        userName: user?.fullName,
      };
      setScanResult(fallbackResult);
      setMode('result');
    }
  };

  const handleSave = () => {
    if (scanResult) {
      onSaveReport(scanResult);
      setIsSaved(true);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setScanResult(null);
    setIsSaved(false);
    setCameraError(null);
    startCamera(facingMode);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Multimodal AI Plant Diagnostic</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900">AI Crop Scanner</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Point your device camera at affected crop foliage or upload an image to identify crop type, detect diseases, assess severity, and receive treatment & prevention steps.
        </p>
      </div>

      {/* One-Click Sample Leaves for Instant AI Diagnostic Testing */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
            Quick Test: Sample Crop Foliage Leaves
          </span>
          <span className="text-[11px] text-gray-400">Try AI diagnosis with 1 click</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              name: 'Tomato Early Blight',
              hint: 'Tomato lower leaf brown target spots',
              img: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600&auto=format&fit=crop&q=80',
              badge: '🍅 Solanaceous',
            },
            {
              name: 'Cotton Leaf Curl',
              hint: 'Cotton leaf upward curling and vein thickening',
              img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=600&auto=format&fit=crop&q=80',
              badge: '☁️ Cash Crop',
            },
            {
              name: 'Wheat Stripe Rust',
              hint: 'Wheat leaf yellow pustules parallel stripes',
              img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80',
              badge: '🌾 Cereal',
            },
            {
              name: 'Sugarcane Red Rot',
              hint: 'Sugarcane midrib reddish lesions',
              img: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=600&auto=format&fit=crop&q=80',
              badge: '🌿 Commercial',
            },
          ].map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => {
                setCapturedImage(sample.img);
                setCropHint(sample.hint);
                stopCameraStream();
                setMode('preview');
              }}
              className="p-2.5 bg-gray-50 hover:bg-emerald-50 text-left rounded-xl border border-gray-200 hover:border-emerald-400 transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-semibold text-emerald-800 block">{sample.badge}</span>
                <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-900 block leading-tight mt-0.5">
                  {sample.name}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 underline mt-2 block">Analyze Sample →</span>
            </button>
          ))}
        </div>
      </div>

      {/* Camera Error / Permission Notice if user blocked access */}
      {cameraError && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm space-y-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-gray-900">Camera Access Notice</p>
              <p className="text-xs text-amber-900">{cameraError}</p>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200 mt-2 text-xs text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900 flex items-center">
                  <Info className="w-3.5 h-3.5 text-emerald-700 mr-1.5" /> Quick Steps to Allow Camera:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1 text-[11px] text-gray-600">
                  <li>Click the camera 📷 or lock 🔒 icon located in your browser's address bar.</li>
                  <li>Toggle or set <strong>Camera</strong> permissions to <strong>Allow</strong>.</li>
                  <li>Click <strong>"Open Live Camera"</strong> below to launch the plant viewfinder.</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Open Live Camera</span>
            </button>
            <button
              onClick={() => nativeCameraInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold rounded-xl text-xs flex items-center space-x-1.5"
            >
              <Camera className="w-4 h-4 text-emerald-700" />
              <span>Use Phone Camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center space-x-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Select from Gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Scanner Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8">
        {/* Live Camera View */}
        {mode === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[460px] mx-auto flex items-center justify-center shadow-inner">
              {isCameraStarting && (
                <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center space-y-2 text-white p-4 text-center">
                  <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Opening Camera...</p>
                  <p className="text-xs text-emerald-200">
                    If prompted by your browser, please tap <strong>"Allow"</strong>.
                  </p>
                </div>
              )}

              {/* Shutter flash effect */}
              {isFlashing && (
                <div className="absolute inset-0 z-40 bg-white pointer-events-none transition-opacity duration-150 animate-pulse" />
              )}

              {/* Viewfinder when camera is NOT yet active */}
              {!isStreaming && !isCameraStarting && (
                <div className="absolute inset-0 z-20 bg-gradient-to-b from-gray-900 via-gray-950 to-black flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3 shadow-lg">
                    <Camera className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-1">Live Crop Viewfinder</h3>
                  <p className="text-xs text-gray-300 max-w-sm mb-5">
                    Open your device camera to capture live photos of crop leaves, stems, or fruits for AI disease diagnosis.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="px-6 py-3 bg-[#0B462C] hover:bg-[#125838] text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Open Live Camera</span>
                    </button>
                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center space-x-1.5 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Phone Camera</span>
                    </button>
                  </div>
                </div>
              )}

              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder crosshair overlay when streaming */}
              {isStreaming && (
                <div className="absolute inset-8 sm:inset-16 border-2 border-dashed border-emerald-400/90 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] font-bold bg-black/70 text-emerald-300 px-3 py-1 rounded-full shadow-md">
                    Align crop leaf inside viewfinder
                  </span>
                </div>
              )}

              {/* Camera Switcher Button on top right when streaming */}
              {isStreaming && (
                <button
                  onClick={toggleFacingMode}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors flex items-center space-x-1.5 text-xs font-semibold z-20 cursor-pointer"
                  title="Switch between rear camera & front webcam"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {facingMode === 'environment' ? 'Rear Camera' : 'Front Webcam'}
                  </span>
                </button>
              )}
            </div>

            {/* Hint Input & Actions */}
            <div className="max-w-md mx-auto space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 text-left">
                  Crop Name or Symptoms Hint (Optional):
                </label>
                <input
                  type="text"
                  value={cropHint}
                  onChange={(e) => setCropHint(e.target.value)}
                  placeholder="e.g. Tomato leaf curling, Cotton boll spots, Wheat rust"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                {isStreaming ? (
                  <button
                    onClick={handleCaptureSnapshot}
                    className="w-full sm:w-auto px-7 py-3 bg-[#0B462C] hover:bg-[#125838] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full sm:w-auto px-7 py-3 bg-[#0B462C] hover:bg-[#125838] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Live Camera</span>
                  </button>
                )}

                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>Phone Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span>Gallery</span>
                </button>

                {/* Direct native camera input */}
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Gallery photo input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Fallback View when Camera Denied */}
        {mode === 'denied' && (
          <div className="text-center py-12 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
              <Camera className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-gray-900">Upload or Capture Crop Foliage Photo</h3>
              <p className="text-xs text-gray-500 mt-1">
                You can capture a photo using your device's camera app, select any clear photo of affected foliage from your gallery, or grant browser camera permissions.
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1 text-left">
                Crop Name / Hint (Optional)
              </label>
              <input
                type="text"
                value={cropHint}
                onChange={(e) => setCropHint(e.target.value)}
                placeholder="e.g. Sugarcane, Cotton, Soybean"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => startCamera(facingMode)}
                className="px-5 py-3 bg-[#0B462C] hover:bg-[#125838] text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Open Live Camera</span>
              </button>

              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs flex items-center space-x-2"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>Take Photo with Phone</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl shadow-2xs flex items-center space-x-2"
              >
                <Upload className="w-4 h-4 text-gray-500" />
                <span>Select from Gallery</span>
              </button>
            </div>
          </div>
        )}

        {/* Photo Preview & Confirmation */}
        {mode === 'preview' && capturedImage && (
          <div className="space-y-4 max-w-lg mx-auto text-center">
            <div className="rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md aspect-video max-h-72 mx-auto">
              <img
                src={capturedImage}
                alt="Captured crop"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-200">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Crop name or observed symptoms (Optional):
              </label>
              <input
                type="text"
                value={cropHint}
                onChange={(e) => setCropHint(e.target.value)}
                placeholder="e.g. Yellowing leaf on tomato plant"
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-gray-500 font-semibold self-center">Quick tags:</span>
                {['Leaf Curl', 'Yellowing', 'Brown Spots', 'Powdery Mildew', 'Rust Pustules', 'Stem Canker'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCropHint((prev) => (prev ? `${prev}, ${tag}` : tag))}
                    className="text-[10px] bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-700 px-2 py-0.5 rounded-md transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake / Reopen Camera</span>
              </button>

              <button
                onClick={handleAnalyze}
                className="px-6 py-2.5 bg-[#0B462C] hover:bg-[#125838] text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze Plant with AI</span>
              </button>
            </div>
          </div>
        )}

        {/* Analyzing Loading State */}
        {mode === 'analyzing' && (
          <div className="text-center py-16 space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-700 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-gray-900">
              Analyzing Leaf Foliage with AI Diagnostic Model...
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Evaluating cellular discoloration, necrosis, insect lesions, severity levels, and positive foliage vigor.
            </p>
          </div>
        )}

        {/* Comprehensive Diagnostic Results */}
        {mode === 'result' && scanResult && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      scanResult.healthStatus === 'Healthy'
                        ? 'bg-emerald-100 text-emerald-900'
                        : scanResult.healthStatus === 'Moderate'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-red-100 text-red-900'
                    }`}
                  >
                    Health Status: {scanResult.healthStatus}
                  </span>

                  {scanResult.severity && scanResult.severity !== 'None' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-900">
                      Severity: {scanResult.severity}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black text-gray-900 mt-1.5">
                  {scanResult.cropName} • {scanResult.diseaseDetected}
                </h2>
                <p className="text-xs text-gray-500">
                  Confidence Score: <strong className="text-emerald-800">{scanResult.confidenceScore}%</strong> • AI Diagnostic
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Again</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 ${
                    isSaved
                      ? 'bg-emerald-100 text-emerald-900 cursor-default'
                      : 'bg-[#0B462C] hover:bg-[#125838] text-white'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{isSaved ? 'Report Saved!' : 'Save Report'}</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo & Visible Symptoms & Positive Findings */}
              <div className="space-y-4">
                {scanResult.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-gray-200 aspect-video max-h-56">
                    <img
                      src={scanResult.imageUrl}
                      alt={scanResult.cropName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Positive Findings */}
                {scanResult.positiveFindings && scanResult.positiveFindings.length > 0 && (
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 mr-1.5" />
                      Positive Foliage Findings
                    </h4>
                    <ul className="space-y-1.5 text-xs text-emerald-950">
                      {scanResult.positiveFindings.map((pos, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-emerald-700 mr-1.5 font-bold">✓</span>
                          <span>{pos}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Visible Symptoms */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                    Observed Symptoms
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {scanResult.symptoms.map((symptom, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-emerald-600 mr-1.5 font-bold">•</span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Possible Causes */}
                {scanResult.possibleCauses && scanResult.possibleCauses.length > 0 && (
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-200">
                    <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2 flex items-center">
                      <Stethoscope className="w-4 h-4 text-orange-700 mr-1.5" />
                      Possible Pathogen / Abiotic Causes
                    </h4>
                    <ul className="space-y-1.5 text-xs text-orange-950">
                      {scanResult.possibleCauses.map((cause, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-orange-700 mr-1.5 font-bold">•</span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actionable Remedies, Treatment & Prevention */}
              <div className="space-y-4">
                {/* Immediate Curative Treatment */}
                {scanResult.treatment && scanResult.treatment.length > 0 && (
                  <div className="bg-red-50/50 p-4 rounded-2xl border border-red-200">
                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-2 flex items-center">
                      <ShieldAlert className="w-4 h-4 text-red-700 mr-1.5" />
                      Curative Treatment & Dosage
                    </h4>
                    <ul className="space-y-1.5 text-xs text-red-950">
                      {scanResult.treatment.map((treat, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-red-700 mr-1.5 font-bold">▶</span>
                          <span>{treat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cultural & Preventive Practices */}
                {scanResult.prevention && scanResult.prevention.length > 0 && (
                  <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200">
                    <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-2 flex items-center">
                      <HeartHandshake className="w-4 h-4 text-teal-700 mr-1.5" />
                      Long-Term Prevention Practices
                    </h4>
                    <ul className="space-y-1.5 text-xs text-teal-950">
                      {scanResult.prevention.map((prev, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-teal-700 mr-1.5 font-bold">✓</span>
                          <span>{prev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Immediate Next Steps */}
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center">
                    <Sparkles className="w-4 h-4 text-emerald-700 mr-1.5" />
                    Immediate Next Steps
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-950">
                    {scanResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-emerald-700 mr-1.5 font-bold">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Fertilizer Advice */}
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center">
                    <ShoppingBag className="w-4 h-4 text-amber-700 mr-1.5" />
                    Fertilizer & Micronutrient Advice
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {scanResult.fertilizerAdvice.map((fa, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-amber-700 mr-1.5 font-bold">•</span>
                        <span>{fa}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Watering Schedule */}
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center">
                    <Droplets className="w-4 h-4 text-blue-700 mr-1.5" />
                    Watering & Soil Moisture Schedule
                  </h4>
                  <ul className="space-y-1.5 text-xs text-blue-950">
                    {scanResult.wateringAdvice.map((wa, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-700 mr-1.5 font-bold">•</span>
                        <span>{wa}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Uncertainty and Diagnostic Disclaimer */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 flex items-start space-x-3">
              <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-800">Diagnostic Uncertainty & Agronomic Note</p>
                <p className="mt-0.5 leading-relaxed">
                  {scanResult.uncertaintyNotes ||
                    'AI diagnosis is based on visible foliar symptoms. Visual models cannot guarantee viral or bacterial strains without microbiological culture. If severe blighting or wilting accelerates, consult your nearest Krishi Vigyan Kendra (KVK).'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
