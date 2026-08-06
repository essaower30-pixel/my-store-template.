import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, FlipHorizontal } from 'lucide-react';

interface ProductCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const ProductCameraCaptureModal: React.FC<ProductCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(null, 'environment');
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async (targetDeviceId?: string | null, targetFacing: 'environment' | 'user' = 'environment') => {
    setErrorMsg(null);
    
    // Stop previous stream tracks to release camera hardware
    stopCamera();

    if (!isOpenRef.current) return;

    try {
      let mediaStream: MediaStream | null = null;

      // 1. Attempt using deviceId if provided
      if (targetDeviceId) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetDeviceId } }
          });
        } catch (e1) {
          if (!isOpenRef.current) {
            if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
            return;
          }
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { ideal: targetDeviceId } }
            });
          } catch (e2) {
            console.warn('Camera start by targetDeviceId failed:', e2);
          }
        }
      }

      // Check after first step
      if (!isOpenRef.current) {
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      // 2. Attempt using facingMode exact
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: targetFacing } }
          });
        } catch (eFacingExact) {
          console.warn('Camera exact facingMode failed:', eFacingExact);
        }
      }

      // Check after second step
      if (!isOpenRef.current) {
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      // 3. Attempt using facingMode ideal
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: targetFacing } }
          });
        } catch (eFacingIdeal) {
          console.warn('Camera ideal facingMode failed:', eFacingIdeal);
        }
      }

      // Check after third step
      if (!isOpenRef.current) {
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      // 4. Attempt fallback to basic video constraint
      if (!mediaStream) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      // Final check
      if (!isOpenRef.current) {
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      setStream(mediaStream);
      if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Play video failed:', e));
      }

      // 5. Enumerate devices AFTER stream is granted to populate device labels & IDs
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
        setCameras(videoInputs);

        const activeTrack = mediaStream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          if (settings.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          }
          if (settings.facingMode) {
            setFacingMode(settings.facingMode as 'environment' | 'user');
          } else {
            // Determine facing mode from label if available
            const matchingDev = videoInputs.find(d => d.deviceId === settings.deviceId);
            if (matchingDev && matchingDev.label) {
              if (/front|user|selfie|أمام|أمامية/i.test(matchingDev.label)) {
                setFacingMode('user');
              } else if (/back|rear|environment|خلف|خلفية/i.test(matchingDev.label)) {
                setFacingMode('environment');
              }
            }
          }
        }
      } catch (enumErr) {
        console.warn('Failed to enumerate devices:', enumErr);
      }

    } catch (err: any) {
      console.warn('Camera starting warning (could be permission or blocked):', err);
      setErrorMsg('تعذر الوصول إلى الكاميرا. يرجى التأكد من سماح المتصفح بالوصول للكاميرا.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    const MAX_DIM = 600;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    if (width > height) {
      if (width > MAX_DIM) {
        height = Math.round(height * (MAX_DIM / width));
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width = Math.round(width * (MAX_DIM / height));
        height = MAX_DIM;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleConfirmImage = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const toggleCameraFacing = async () => {
    let nextDeviceId: string | null = null;
    const nextFacing: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment';

    if (cameras.length > 1) {
      const currentIdx = cameras.findIndex(c => c.deviceId === selectedDeviceId);
      const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % cameras.length : 1;
      nextDeviceId = cameras[nextIdx].deviceId;
      setSelectedDeviceId(nextDeviceId);
    }

    setFacingMode(nextFacing);
    await startCamera(nextDeviceId, nextFacing);
  };

  const handleSelectCameraDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    await startCamera(deviceId, facingMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md text-right animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-900 text-white flex items-center justify-between border-b border-purple-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">التقاط صورة الصنف بالكاميرا</h3>
              <p className="text-[11px] text-purple-200">صوّر عبوة أو غلاف المنتج مباشرة لالتقاطها للمخزن</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!capturedImage ? (
            <div className="space-y-4">
              <div className="relative aspect-square max-h-72 mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Framing Overlay */}
                <div className="absolute inset-6 border-2 border-dashed border-purple-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] font-bold text-purple-200 bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-xs">
                    ضع المنتج منتصف الإطار
                  </span>
                </div>

                {/* Camera Flip Quick Badge Overlay */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="absolute top-3 left-3 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-purple-300" />
                  <span>{facingMode === 'environment' ? 'كاميرا خلفية 📷' : 'كاميرا أمامية 🤳'}</span>
                </button>

                {errorMsg && (
                  <div className="absolute inset-0 bg-slate-950/90 text-rose-300 p-4 flex flex-col items-center justify-center text-center gap-2">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <p className="text-xs font-bold">{errorMsg}</p>
                  </div>
                )}
              </div>

              {/* Camera Selection Dropdown if multiple devices found */}
              {cameras.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <FlipHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">اختر الكاميرا:</span>
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => handleSelectCameraDevice(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-hidden"
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId}>
                        {cam.label || `كاميرا ${idx + 1} (${cam.deviceId.slice(0, 6)}...)`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="px-4 py-3 bg-purple-100 dark:bg-purple-950/50 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-bold rounded-2xl transition-all cursor-pointer border border-purple-200 dark:border-purple-800 flex items-center gap-2 text-xs"
                  title="تبديل الكاميرا (أمامية / خلفية)"
                >
                  <FlipHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>تبديل الكاميرا {facingMode === 'environment' ? '(أمامية 🤳)' : '(خلفية 📷)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  className="flex-1 max-w-xs bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 px-6 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-xs active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  <span>التقاط الصورة الآن</span>
                </button>
              </div>

              {/* Iframe Camera Permission Hint */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                💡 <strong>ملاحظة للموبايل:</strong> قد يقوم المتصفح بحظر الكاميرا الخلفية داخل إطار المعاينة. إذا لم تظهر الكاميرا الخلفية، انقر على زر <strong>"فتح في نافذة جديدة ↗️"</strong> أعلى شريط المعاينة.
              </p>
            </div>
          ) : (
            /* Preview captured photo */
            <div className="space-y-4 text-center">
              <div className="relative aspect-square max-h-72 mx-auto rounded-2xl overflow-hidden border-2 border-purple-500 shadow-lg bg-slate-900">
                <img
                  src={capturedImage}
                  alt="الصورة الملتقطة"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera(facingMode);
                  }}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة الالتقاط</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImage}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد واستخدام الصورة</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
