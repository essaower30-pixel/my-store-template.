import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Sparkles, Upload, Keyboard, SwitchCamera, Image as ImageIcon, Check, Zap, Flashlight } from 'lucide-react';
import { Product } from '../types/accounting';
import { cleanBarcode, isBarcodeMatch } from '../utils/searchUtils';
import { playSuccessBeep, playErrorBeep } from '../utils/audioUtils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
  title?: string;
  continuous?: boolean;
  products?: Product[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'مسح الباركود باستخدام كاميرا الموبايل',
  continuous = false,
  products = []
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'manual'>('camera');
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('environment');
  const [manualCode, setManualCode] = useState('');
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [fileScanSuccessMsg, setFileScanSuccessMsg] = useState<string | null>(null);
  const [continuousScanMsg, setContinuousScanMsg] = useState<string | null>(null);
  const [continuousScanError, setContinuousScanError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(true);
  const [usingNativeDetector, setUsingNativeDetector] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const lastScanTimeRef = useRef<{ [code: string]: number }>({});

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanAnimationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasScannedRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const containerId = 'interactive-barcode-scanner-box';

  const isMountedRef = useRef(true);

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await stopScanner();
    } catch (err) {
      console.warn('Error in stopScanner during close:', err);
    } finally {
      setIsClosing(false);
      onClose();
    }
  };
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      hasScannedRef.current = false;
      stopScanner();
      return;
    }

    // Reset state on open
    hasScannedRef.current = false;
    setError(null);
    setIsPermissionDenied(false);
    setManualCode('');
    setFileScanSuccessMsg(null);
    setIsTorchOn(false);

    if (activeTab === 'camera') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (!isMountedRef.current) return;
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Prioritize "camera 0" with a robust word-boundary search, then other back/rear camera labels, and fallback to first device
            const backCam = devices.find(d => {
              const lbl = (d.label || '').toLowerCase();
              return /camera\s*0\b/.test(lbl) || /\b0\b/.test(lbl) || /\b٠\b/.test(lbl);
            }) || devices.find(d => {
              const lbl = (d.label || '').toLowerCase();
              return lbl.includes('back') || 
                     lbl.includes('rear') || 
                     lbl.includes('environment') ||
                     lbl.includes('خلفية');
            }) || devices[0];
            const bestCamId = backCam ? backCam.id : 'environment';
            setSelectedCameraId(bestCamId);
            startScanner(bestCamId);
          } else {
            setSelectedCameraId('environment');
            startScanner('environment');
          }
        })
        .catch((err) => {
          console.warn('Could not enumerate cameras, checking if permission denied:', err);
          const errStr = String(err).toLowerCase();
          const isPermission = 
            errStr.includes('notallowederror') || 
            errStr.includes('permission') || 
            errStr.includes('denied') || 
            (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'NotReadableError'));

          if (isPermission) {
            setIsPermissionDenied(true);
            setError('NotAllowedError: Permission denied');
          } else {
            setSelectedCameraId('environment');
            startScanner('environment');
          }
        });
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const startScanner = async (cameraIdToUse?: string) => {
    try {
      setError(null);
      await stopScanner();

      if (!isMountedRef.current) return;

      // Check if browser supports native BarcodeDetector API (Ultra-fast GPU hardware accelerated)
      const hasNativeBarcodeDetector = 'BarcodeDetector' in window;
      setUsingNativeDetector(hasNativeBarcodeDetector);

      // Standard Html5Qrcode initialization
      const containerEl = document.getElementById(containerId);
      if (!containerEl) {
        console.warn(`Container element #${containerId} not present in DOM yet.`);
        return;
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      const html5Qrcode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false
      });
      scannerRef.current = html5Qrcode;

      const targetCam = cameraIdToUse || selectedCameraId || 'environment';
      
      const cameraConfig = targetCam === 'environment'
        ? { facingMode: 'environment' }
        : targetCam;

      const config: any = {
        fps: 30, // High FPS for real-time, ultra-fast and responsive scanning
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const container = document.getElementById(containerId);
          const cWidth = container ? container.clientWidth : 0;
          const cHeight = container ? container.clientHeight : 0;
          const maxW = cWidth > 50 ? cWidth : 320;
          const maxH = cHeight > 50 ? cHeight : 380;
          const width = Math.min(Math.max(Math.floor(maxW * 0.92), 240), maxW - 4);
          const height = Math.min(Math.max(Math.floor(maxH * 0.78), 220), maxH - 4);
          return { width, height };
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      try {
        await html5Qrcode.start(
          cameraConfig,
          config,
          (decodedText) => {
            if (decodedText) {
              handleSuccess(decodedText.trim());
            }
          },
          () => {}
        );
        if (!isMountedRef.current) {
          try {
            await html5Qrcode.stop();
          } catch (stopErr) {
            console.warn(stopErr);
          }
          return;
        }
        setIsScanning(true);
        applyTorchAuto(html5Qrcode);

        // Re-query cameras now that permission is granted to get real, populated labels
        Html5Qrcode.getCameras().then((devices) => {
          if (!isMountedRef.current) return;
          if (devices && devices.length > 0) {
            setCameras(devices);
          }
        }).catch((err) => console.warn('Could not re-query cameras on start success:', err));
      } catch (err1) {
        console.warn('First camera initialization attempt failed. Retrying fallback 1 (Standard environment)...', err1);
        if (!isMountedRef.current) return;

        // Fallback 1: Standard environment camera with safe lower configuration
        try {
          await html5Qrcode.start(
            { facingMode: 'environment' },
            {
              fps: 30,
              qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const container = document.getElementById(containerId);
                const cWidth = container ? container.clientWidth : 0;
                const cHeight = container ? container.clientHeight : 0;
                const maxW = cWidth > 50 ? cWidth : 320;
                const maxH = cHeight > 50 ? cHeight : 380;
                const width = Math.min(Math.max(Math.floor(maxW * 0.92), 240), maxW - 4);
                const height = Math.min(Math.max(Math.floor(maxH * 0.78), 220), maxH - 4);
                return { width, height };
              }
            },
            (decodedText) => {
              if (decodedText) {
                handleSuccess(decodedText.trim());
              }
            },
            () => {}
          );
          if (!isMountedRef.current) {
            try {
              await html5Qrcode.stop();
            } catch (stopErr) {
              console.warn(stopErr);
            }
            return;
          }
          setIsScanning(true);
          applyTorchAuto(html5Qrcode);
        } catch (err2) {
          console.warn('Fallback 1 failed. Retrying fallback 2 (Any video source / user camera)...', err2);
          if (!isMountedRef.current) return;

          // Fallback 2: Any video input / Front camera
          try {
            await html5Qrcode.start(
              { facingMode: 'user' },
              { 
                fps: 30,
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                  const container = document.getElementById(containerId);
                  const cWidth = container ? container.clientWidth : 0;
                  const cHeight = container ? container.clientHeight : 0;
                  const maxW = cWidth > 50 ? cWidth : 320;
                  const maxH = cHeight > 50 ? cHeight : 380;
                  const width = Math.min(Math.max(Math.floor(maxW * 0.92), 240), maxW - 4);
                  const height = Math.min(Math.max(Math.floor(maxH * 0.78), 220), maxH - 4);
                  return { width, height };
                }
              },
              (decodedText) => {
                if (decodedText) {
                  handleSuccess(decodedText.trim());
                }
              },
              () => {}
            );
            if (!isMountedRef.current) {
              try {
                await html5Qrcode.stop();
              } catch (stopErr) {
                console.warn(stopErr);
              }
              return;
            }
            setIsScanning(true);
            applyTorchAuto(html5Qrcode);
          } catch (err3) {
            console.error('All live camera initialization attempts failed.', err3);
            throw err3;
          }
        }
      }
    } catch (err: any) {
      console.warn('Scanner camera warning (could be permission or blocked):', err);
      const errStr = String(err).toLowerCase();
      const isPermission = 
        errStr.includes('notallowederror') || 
        errStr.includes('permission') || 
        errStr.includes('denied') || 
        (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'NotReadableError'));

      if (isPermission) {
        setIsPermissionDenied(true);
        setError('NotAllowedError: Permission denied');
      } else {
        setError('تعذر تشغيل كاميرا الموبايل الحية. يمكنك اختيار كاميرا أخرى، أو استخدام "التقاط صورة"، أو الإدخال اليدوي.');
      }
      setIsScanning(false);
    }
  };

  const applyTorchAuto = async (html5Qrcode: Html5Qrcode) => {
    try {
      // Small delay to allow camera stream to stabilize and capabilities to populate
      await new Promise(resolve => setTimeout(resolve, 400));
      if (!isMountedRef.current || !html5Qrcode.isScanning) return;
      
      let enabled = false;

      // Approach 1: HTML5Qrcode built-in capabilities
      try {
        const capabilities = html5Qrcode.getRunningTrackCapabilities();
        const hasTorchCap = !!(capabilities && (capabilities as any).torch);
        if (hasTorchCap) {
          await html5Qrcode.applyVideoConstraints({
            advanced: [{ torch: true } as any]
          });
          setIsTorchOn(true);
          setHasTorch(true);
          enabled = true;
          console.log('Flash auto-enabled successfully via HTML5Qrcode.');
        }
      } catch (err) {
        console.warn('HTML5Qrcode built-in torch auto-enable failed:', err);
      }

      // Approach 2: Direct Video Track Fallback (extremely reliable on mobile Safari/Chrome)
      if (!enabled) {
        try {
          const videoElement = document.querySelector(`#${containerId} video`) as HTMLVideoElement | null;
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track) {
              await track.applyConstraints({
                advanced: [{ torch: true } as any]
              });
              setIsTorchOn(true);
              setHasTorch(true);
              enabled = true;
              console.log('Flash auto-enabled successfully via direct video track.');
            }
          }
        } catch (fallbackErr) {
          console.warn('Direct video track torch auto-enable failed:', fallbackErr);
        }
      }
    } catch (torchErr) {
      console.warn('Auto-enabling torch/flash failed entirely:', torchErr);
    }
  };

  const stopScanner = async () => {
    if (isStoppingRef.current) {
      return;
    }
    isStoppingRef.current = true;
    try {
      if (scanAnimationRef.current) {
        cancelAnimationFrame(scanAnimationRef.current);
        scanAnimationRef.current = null;
      }

      // Nullify video event listeners on active elements inside container first
      try {
        const videos = document.querySelectorAll(`#${containerId} video`) as NodeListOf<HTMLVideoElement>;
        videos.forEach(video => {
          video.onabort = null;
          video.onerror = null;
          video.onstalled = null;
          video.onsuspend = null;
          video.onpause = null;
        });
      } catch (err) {
        console.warn('Could not nullify video event listeners:', err);
      }

      // 1. Let HTML5Qrcode stop properly first
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {
          console.error('Failed to stop barcode scanner gracefully', e);
        }
        scannerRef.current = null;
      }

      // 2. Clean up media stream ref
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch {}
        });
        mediaStreamRef.current = null;
      }

      // 3. Fallback safety net - only if there are still active videos/streams that HTML5Qrcode somehow left active
      try {
        const videos = document.querySelectorAll(`#${containerId} video`) as NodeListOf<HTMLVideoElement>;
        videos.forEach(video => {
          video.onabort = null;
          video.onerror = null;
          video.onstalled = null;
          video.onsuspend = null;
          video.onpause = null;
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              try {
                track.stop();
                console.log('Safety stopped track:', track.label);
              } catch (trackErr) {
                console.warn('Safety stop track error:', trackErr);
              }
            });
            video.srcObject = null;
          }
        });
      } catch (err) {
        console.warn('Safety stop tracks failed:', err);
      }

      setIsScanning(false);
      setIsTorchOn(false);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const toggleTorch = async () => {
    const nextState = !isTorchOn;
    let success = false;

    // Approach 1: HTML5Qrcode API
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: nextState } as any]
        });
        setIsTorchOn(nextState);
        success = true;
      } catch (e) {
        console.warn('HTML5Qrcode torch toggle failed:', e);
      }
    }

    // Approach 2: Direct Track Fallback
    if (!success) {
      try {
        const videoElement = document.querySelector(`#${containerId} video`) as HTMLVideoElement | null;
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track) {
            await track.applyConstraints({
              advanced: [{ torch: nextState } as any]
            });
            setIsTorchOn(nextState);
            success = true;
          }
        }
      } catch (err) {
        console.warn('Direct track torch toggle failed:', err);
      }
    }
  };

  const handleSuccess = (code: string) => {
    if (!isOpen) return; // Ignore any scans after the modal has been closed
    const now = Date.now();
    const cleanCode = cleanBarcode(code);
    if (!cleanCode) return;

    // 1. Check if this is an exact match for any product in our list
    const hasExactMatch = products?.some(p => isBarcodeMatch(p.barcode, cleanCode));

    // 2. Check if this is a partial/incomplete scan of a valid product's barcode.
    // If it is a partial scan (i.e. is a prefix of some longer barcode in products list),
    // we should IGNORE it to allow the camera to focus and decode the full barcode on the next frames.
    if (!hasExactMatch && products && products.length > 0 && cleanCode.length >= 3) {
      const isPartialOfExisting = products.some(p => {
        const cleanP = cleanBarcode(p.barcode);
        return cleanP.startsWith(cleanCode) && cleanP !== cleanCode;
      });
      if (isPartialOfExisting) {
        console.log(`Ignoring partial barcode match during scan: "${cleanCode}" to allow full focus.`);
        return;
      }
    }

    const lastTime = lastScanTimeRef.current[cleanCode] || 0;
    
    // 3.0 second cooldown per same barcode to prevent duplicate scan bursts
    if (now - lastTime < 3000) {
      return;
    }
    lastScanTimeRef.current[cleanCode] = now;

    if (continuous) {
      onScanSuccess(code);
      
      // Look up product name for a delightful continuous feedback banner
      const matchedProd = products?.find(p => isBarcodeMatch(p.barcode, cleanCode));
      if (matchedProd) {
        playSuccessBeep();
        setContinuousScanError(null);
        setContinuousScanMsg(`تمت إضافة: "${matchedProd.name}" ⚡`);
      } else {
        playErrorBeep();
        setContinuousScanMsg(null);
        setContinuousScanError(`تمت قراءة باركود: "${code}" (الباركود غير مسجل في المخزن!)`);
      }
      
      // Auto-clear message after 3 seconds
      setTimeout(() => {
        setContinuousScanMsg(null);
        setContinuousScanError(null);
      }, 3000);
    } else {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      
      const matchedProd = products?.find(p => isBarcodeMatch(p.barcode, cleanCode));
      if (matchedProd) {
        playSuccessBeep();
      } else {
        playErrorBeep();
      }
      
      handleClose().then(() => {
        onScanSuccess(code);
      }).catch((err) => {
        console.warn('Error during handleClose:', err);
        onScanSuccess(code);
      });
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    if (activeTab === 'camera') {
      await startScanner(newId);
    }
  };

  const handleToggleCameraNext = async () => {
    if (cameras.length > 1) {
      const currentIdx = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIdx = (currentIdx + 1) % cameras.length;
      const nextId = cameras[nextIdx].id;
      setSelectedCameraId(nextId);
      await startScanner(nextId);
    } else {
      await startScanner();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsFileProcessing(true);
      setError(null);
      setFileScanSuccessMsg(null);

      // Fast check with native BarcodeDetector for uploaded file image
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf']
          });
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await img.decode();
          const barcodes = await barcodeDetector.detect(img);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const code = barcodes[0].rawValue.trim();
            setFileScanSuccessMsg(`تم الالتقاط السريع: ${code}`);
            setTimeout(() => handleSuccess(code), 300);
            return;
          }
        } catch (e) {
          console.warn('Native image scan fallback to JS decoder', e);
        }
      }

      // Fallback file scan
      const html5Qrcode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false
      });

      const decodedResult = await html5Qrcode.scanFileV2(file, true);
      if (decodedResult && decodedResult.decodedText) {
        const scannedCode = decodedResult.decodedText.trim();
        setFileScanSuccessMsg(`تم التقاط الباركود بنجاح: ${scannedCode}`);
        setTimeout(() => {
          handleSuccess(scannedCode);
        }, 500);
      } else {
        setError('لم يتم العثور على باركود واضح في الصورة. يرجى التكبير والالتقاط بوضوح.');
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      setError('لم يستطع النظام قراءة الباركود من الصورة. يرجى التأكد من الوضوح أو الإدخال اليدوي.');
    } finally {
      setIsFileProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccess(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 dir-rtl text-right overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[95vh] border border-gray-100 p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-xs shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-indigo-950 text-sm">{title}</h3>
                {usingNativeDetector && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                    فائق السرعة
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">كاميرا الموبايل والتقاط الباركود المباشر</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'camera' ? 'bg-white text-indigo-900 shadow-xs font-extrabold' : 'hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>كاميرا حية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'file' ? 'bg-white text-indigo-900 shadow-xs font-extrabold' : 'hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>التقاط صورة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'manual' ? 'bg-white text-indigo-900 shadow-xs font-extrabold' : 'hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>إدخال يدوي</span>
          </button>
        </div>

        {/* Tab 1: Live Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {/* Camera Controls & Torch */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                <SwitchCamera className="w-4 h-4 text-slate-500 shrink-0" />
                <select
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="environment">📷 الكاميرا الخلفية (تلقائي)</option>
                  {cameras.map((cam, i) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `كاميرا رقم ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                    isTorchOn ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <Flashlight className="w-3.5 h-3.5" />
                  <span>{isTorchOn ? 'الفلاش يعمل' : 'تشغيل الفلاش'}</span>
                </button>
              )}
            </div>

            {error ? (
              isPermissionDenied ? (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl text-right space-y-4 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <h4 className="font-extrabold text-sm">تم رفض إذن الكاميرا أو حجبها 🔒</h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                    لقد تم رفض إذن استخدام الكاميرا من قبل المتصفح، أو تم حجبها بسبب تشغيل التطبيق داخل إطار مضمن (iFrame) في منصة التطوير. يرجى اتباع الخطوات التالية لتشغيلها:
                  </p>

                  <div className="bg-white border border-slate-100 p-3.5 rounded-2xl space-y-2.5 text-[11px] text-slate-700">
                    <div className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-[10px]">١</span>
                      <span>انقر على أيقونة <strong>القفل (🔒)</strong> في شريط العنوان بالمتصفح في الأعلى لتعديل الصلاحيات.</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-[10px]">٢</span>
                      <span>قم بتغيير إذن <strong>الكاميرا (Camera)</strong> إلى <strong>"سماح" (Allow)</strong>.</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-[10px]">٣</span>
                      <span>أو انقر على زر <strong>"فتح في تبويب خارجي ↗️"</strong> في أعلى شريط المعاينة لتجاوز قيود النوافذ المضمنة.</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPermissionDenied(false);
                        setError(null);
                        startScanner();
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة المحاولة بعد السماح</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('file')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>التقاط صورة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>إدخال يدوي</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-rose-50 border border-rose-200 rounded-3xl text-right space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <h4 className="font-extrabold text-sm">عذراً، تعذر تشغيل الكاميرا الحية ⚠️</h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                    {error}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        startScanner();
                      }}
                      className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة التشغيل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('file')}
                      className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>التقاط صورة باركود</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className="relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500 h-[380px] w-full shadow-inner">
                  {/* Html5Qrcode Container */}
                  <div id={containerId} className="w-full h-full text-white text-xs text-center block absolute inset-0" />

                  {/* Scan Line Animation overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-2">
                      <div className="w-[92%] h-[290px] border-2 border-dashed border-emerald-400/80 rounded-xl relative flex items-center justify-center overflow-hidden">
                        <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Continuous Scan Status Banners */}
                  {continuousScanMsg && (
                    <div className="absolute inset-x-0 bottom-0 bg-emerald-600/95 backdrop-blur-xs text-white p-3 text-xs font-black text-center animate-in slide-in-from-bottom duration-200 flex items-center justify-center gap-1.5 z-10">
                      <Check className="w-4 h-4 text-emerald-100 shrink-0" />
                      <span>{continuousScanMsg}</span>
                    </div>
                  )}

                  {continuousScanError && (
                    <div className="absolute inset-x-0 bottom-0 bg-rose-600/95 backdrop-blur-xs text-white p-3 text-xs font-black text-center animate-in slide-in-from-bottom duration-200 flex items-center justify-center gap-1.5 z-10">
                      <AlertCircle className="w-4 h-4 text-rose-100 shrink-0" />
                      <span>{continuousScanError}</span>
                    </div>
                  )}

                  {!isScanning && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white p-4 space-y-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                      <p className="text-xs font-bold">جاري تشغيل محرك الفحص الفائق...</p>
                    </div>
                  )}
                </div>

                <div className="bg-emerald-50/90 border border-emerald-200 p-2.5 rounded-xl text-center">
                  <p className="text-[11px] font-bold text-emerald-950 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>وجه الباركود نحو المستطيل وسيتم اللقط فورياً بدون تأخير</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Take Photo / Upload Image */}
        {activeTab === 'file' && (
          <div className="space-y-3 text-center py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="p-6 bg-slate-50 border-2 border-dashed border-indigo-200 rounded-3xl space-y-4">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Camera className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">التقاط صورة مباشرة للباركود</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  التقط صورة للباركود باستخدام كاميرا الموبايل الأساسية ذات التركيز التلقائي
                </p>
              </div>

              <button
                type="button"
                disabled={isFileProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isFileProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تحليل وقراءة الباركود...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>فتح الكاميرا والتقاط صورة الباركود</span>
                  </>
                )}
              </button>
            </div>

            {fileScanSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-black flex items-center justify-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{fileScanSuccessMsg}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold leading-relaxed">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Manual Input */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                أدخل رقم الباركود يدويًا:
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="مثال: 6291100021234"
                autoFocus
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl font-mono text-base font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all dir-ltr text-center"
              />
            </div>

            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl transition-colors cursor-pointer shadow-sm disabled:opacity-40"
            >
              تأكيد وإدخال الباركود
            </button>
          </form>
        )}

        {/* Footer Close */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            disabled={isClosing}
            onClick={handleClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {isClosing ? 'جاري الإغلاق الآمن...' : 'إغلاق النافذة'}
          </button>
        </div>

      </div>
    </div>
  );
};

