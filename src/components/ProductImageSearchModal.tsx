import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  ShoppingBag, 
  AlertCircle, 
  RefreshCw, 
  ImageIcon,
  ArrowLeft,
  ChevronLeft,
  ScanLine,
  FlipHorizontal
} from 'lucide-react';
import { Product, ShopSettings } from '../types/accounting';
import { compressImageFile } from '../utils/imageCompressor';

interface ProductImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: ShopSettings;
  onSelectProduct: (product: Product) => void;
  isFastScanMode?: boolean;
}

export const ProductImageSearchModal: React.FC<ProductImageSearchModalProps> = ({
  isOpen,
  onClose,
  products,
  settings,
  onSelectProduct,
  isFastScanMode = true
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('camera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [candidateProducts, setCandidateProducts] = useState<Product[]>([]);

  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const lastAddedTimeRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);
  const cooldownUntilRef = useRef<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Countdown timer for scanner cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Sync isAutoScanning with isFastScanMode
  useEffect(() => {
    if (isFastScanMode) {
      setIsAutoScanning(true);
    }
  }, [isFastScanMode, isOpen]);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);
  const [scannedProductOverlay, setScannedProductOverlay] = useState<Product | null>(null);

  // Camera video stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const playSuccessBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  const captureFrameForAutoScan = async () => {
    if (!videoRef.current || !cameraActive || isAnalyzingRef.current || isAnalyzing || scannedProductOverlay) return;
    
    const now = Date.now();
    const timeSinceLastAdd = now - lastAddedTimeRef.current;
    if (timeSinceLastAdd < 4000) {
      const remainingSecs = Math.ceil((4000 - timeSinceLastAdd) / 1000);
      if (remainingSecs > 0 && remainingSecs !== cooldownRemaining) {
        setCooldownRemaining(remainingSecs);
      }
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    setScanStatusMsg('جاري فحص المنتج تلقائياً...');

    // 1. Try local hardware-accelerated Barcode Detection first for super-fast scans!
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf']
        });
        const detected = await barcodeDetector.detect(canvas);
        if (detected && detected.length > 0 && detected[0].rawValue) {
          const rawCode = detected[0].rawValue.trim();
          // Match barcode in product list
          const found = products.find(p => p.barcode && String(p.barcode).trim() === rawCode);
          if (found) {
            playSuccessBeep();
            
            const timeNow = Date.now();
            lastAddedTimeRef.current = timeNow;
            cooldownUntilRef.current = timeNow + 4000;
            setCooldownRemaining(4);
            onSelectProduct(found);
            
            setScannedProductOverlay(found);
            setScanStatusMsg(`تمت قراءة الباركود وإضافة "${found.name}" تلقائياً! ⚡`);
            
            setTimeout(() => {
              setScannedProductOverlay(null);
              setScanStatusMsg(null);
            }, 3000);
            
            isAnalyzingRef.current = false;
            setIsAnalyzing(false);
            return;
          }
        }
      } catch (detErr) {
        console.warn('Local barcode detector error in auto scan:', detErr);
      }
    }
    
    try {
      const response = await fetch('/api/identify-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            category: p.category,
            sellingPrice: p.sellingPrice,
            unit: p.unit
          }))
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No match');
      }

      if (data.matchedProductId) {
        const found = products.find(p => p.id === data.matchedProductId);
        // Minimum confidence 70% to trigger auto-add
        if (found && (data.confidence || 0) >= 70) {
          playSuccessBeep();
          
          const timeNow = Date.now();
          lastAddedTimeRef.current = timeNow;
          cooldownUntilRef.current = timeNow + 4000;
          setCooldownRemaining(4);
          onSelectProduct(found);
          
          setScannedProductOverlay(found);
          setScanStatusMsg(`تمت إضافة "${found.name}" بنجاح!`);
          
          // Clear overlay after 3 seconds
          setTimeout(() => {
            setScannedProductOverlay(null);
            setScanStatusMsg(null);
          }, 3000);
          return;
        }
      }
      
      setScanStatusMsg('جاري البحث المستمر عن منتج...');
      setTimeout(() => {
        setScanStatusMsg(null);
      }, 1500);
      
    } catch (err) {
      console.warn('Auto scan error:', err);
      setScanStatusMsg(null);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    let intervalId: any = null;
    
    if (isOpen && activeTab === 'camera' && cameraActive && isAutoScanning && !isAnalyzing && !scannedProductOverlay) {
      // Run once after 1.2 seconds delay to let camera stabilize
      const delayTimeout = setTimeout(() => {
        captureFrameForAutoScan();
      }, 1200);

      const intervalMs = isFastScanMode ? 2500 : 4000;
      intervalId = setInterval(() => {
        captureFrameForAutoScan();
      }, intervalMs);
      
      return () => {
        clearTimeout(delayTimeout);
        clearInterval(intervalId);
      };
    }
  }, [isOpen, activeTab, cameraActive, isAutoScanning, isAnalyzing, scannedProductOverlay, isFastScanMode]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'camera' && isOpen) {
      startCamera(null, 'environment');
    } else {
      stopCamera();
    }
  }, [activeTab, isOpen]);

  const resetState = () => {
    setSelectedImage(null);
    setIsAnalyzing(false);
    setErrorMsg(null);
    setReasoning(null);
    setConfidence(null);
    setMatchedProduct(null);
    setCandidateProducts([]);
  };

  const startCamera = async (targetDeviceId?: string | null, targetFacing: 'environment' | 'user' = 'environment') => {
    try {
      setErrorMsg(null);
      stopCamera();

      if (!isOpenRef.current) return;

      let stream: MediaStream | null = null;

      // 1. Attempt using deviceId if provided
      if (targetDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetDeviceId } }
          });
        } catch (e1) {
          if (!isOpenRef.current) {
            if (stream) stream.getTracks().forEach(t => t.stop());
            return;
          }
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { ideal: targetDeviceId } }
            });
          } catch (e2) {
            console.warn('Camera start by targetDeviceId failed:', e2);
          }
        }
      }

      // Check after first step
      if (!isOpenRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      // 2. Attempt using facingMode exact
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: targetFacing } }
          });
        } catch (eFacingExact) {
          console.warn('Camera exact facingMode failed:', eFacingExact);
        }
      }

      // Check after second step
      if (!isOpenRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      // 3. Attempt using facingMode ideal
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: targetFacing } }
          });
        } catch (eFacingIdeal) {
          console.warn('Camera ideal facingMode failed:', eFacingIdeal);
        }
      }

      // Check after third step
      if (!isOpenRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      // 4. Fallback to basic video constraint
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      // Final check
      if (!isOpenRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      setCameraStream(stream);
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(pErr => console.warn('Video play deferred:', pErr));
      }
      setCameraActive(true);

      // 5. Enumerate devices AFTER stream is granted to populate device labels & IDs
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
        setCameras(videoInputs);

        const activeTrack = stream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          if (settings.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          }
          if (settings.facingMode) {
            setFacingMode(settings.facingMode as 'environment' | 'user');
          } else {
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
      setErrorMsg('تعذر الوصول إلى الكاميرا. يرجى التأكد من إعطاء صلاحية الكاميرا للمتصفح أو استخدام رفع صورة.');
      setCameraActive(false);
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

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || isAnalyzingRef.current || isAnalyzing) return;
    
    const now = Date.now();
    const timeSinceLastAdd = now - lastAddedTimeRef.current;
    if (timeSinceLastAdd < 4000) {
      const remainingSecs = Math.ceil((4000 - timeSinceLastAdd) / 1000);
      if (remainingSecs > 0 && remainingSecs !== cooldownRemaining) {
        setCooldownRemaining(remainingSecs);
      }
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setSelectedImage(dataUrl);
      stopCamera();
      
      isAnalyzingRef.current = true;
      setIsAnalyzing(true);
      setErrorMsg(null);
      setMatchedProduct(null);
      setCandidateProducts([]);
      setReasoning(null);
      setConfidence(null);

      // Try local hardware-accelerated Barcode Detection first!
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf']
          });
          const detected = await barcodeDetector.detect(canvas);
          if (detected && detected.length > 0 && detected[0].rawValue) {
            const rawCode = detected[0].rawValue.trim();
            const found = products.find(p => p.barcode && String(p.barcode).trim() === rawCode);
            if (found) {
              playSuccessBeep();
              
              const timeNow = Date.now();
              lastAddedTimeRef.current = timeNow;
              cooldownUntilRef.current = timeNow + 4000;
              setCooldownRemaining(4);
              onSelectProduct(found);
              
              if (isFastScanMode) {
                setScannedProductOverlay(found);
                setScanStatusMsg(`تمت قراءة الباركود وإضافة "${found.name}" بنجاح! ⚡`);
                setSelectedImage(null);
                setIsAnalyzing(false);
                isAnalyzingRef.current = false;
                
                setTimeout(async () => {
                  setScannedProductOverlay(null);
                  setScanStatusMsg(null);
                  await startCamera(selectedDeviceId, facingMode);
                }, 3000);
                return;
              } else {
                isAnalyzingRef.current = false;
                setIsAnalyzing(false);
                onClose(); // Close modal immediately
                return;
              }
            }
          }
        } catch (detErr) {
          console.warn('Local barcode detector error in capture photo:', detErr);
        }
      }
      
      try {
        const response = await fetch('/api/identify-product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageBase64: dataUrl,
            products: products.map(p => ({
              id: p.id,
              name: p.name,
              barcode: p.barcode,
              category: p.category,
              sellingPrice: p.sellingPrice,
              unit: p.unit
            }))
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'No match');
        }

        if (data.matchedProductId) {
          const found = products.find(p => p.id === data.matchedProductId);
          if (found && (data.confidence || 0) >= 70) {
            playSuccessBeep();
            
            const timeNow = Date.now();
            lastAddedTimeRef.current = timeNow;
            cooldownUntilRef.current = timeNow + 4000;
            setCooldownRemaining(4);
            onSelectProduct(found);
            
            if (isFastScanMode) {
              setScannedProductOverlay(found);
              setScanStatusMsg(`تمت إضافة "${found.name}" بنجاح!`);
              setSelectedImage(null);
              setIsAnalyzing(false);
              
              setTimeout(async () => {
                setScannedProductOverlay(null);
                setScanStatusMsg(null);
                await startCamera(selectedDeviceId, facingMode);
              }, 3000);
              return;
            } else {
              onClose(); // Close modal immediately
              return;
            }
          }
        }

        // If it didn't auto-add (e.g. low confidence or no direct match), show reasoning and candidates
        setReasoning(data.reasoning || null);
        setConfidence(data.confidence || null);

        if (data.matchedProductId) {
          const found = products.find(p => p.id === data.matchedProductId);
          if (found) {
            setMatchedProduct(found);
          }
        }

        if (Array.isArray(data.candidateProductIds) && data.candidateProductIds.length > 0) {
          const candidates = data.candidateProductIds
            .map((id: string) => products.find(p => p.id === id))
            .filter(Boolean) as Product[];
          setCandidateProducts(candidates);
        } else if (!data.matchedProductId) {
          setCandidateProducts(products.slice(0, 4));
        }

      } catch (err: any) {
        console.warn('AI identification error, fallback:', err);
        setErrorMsg(err?.message || 'حدث خطأ في خدمة الذكاء الاصطناعي');
        setCandidateProducts(products.slice(0, 4));
      } finally {
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالحة (JPG, PNG, WebP)');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      // Fast client-side image compression down to 800x800 JPEG ~50KB
      const compressedDataUrl = await compressImageFile(file, 800, 800, 0.82);
      setSelectedImage(compressedDataUrl);
      await analyzeImage(compressedDataUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر معالجة الصورة المصورة');
      setIsAnalyzing(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const analyzeImage = async (imageDataUrl: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setMatchedProduct(null);
    setCandidateProducts([]);
    setReasoning(null);
    setConfidence(null);

    try {
      const response = await fetch('/api/identify-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            category: p.category,
            sellingPrice: p.sellingPrice,
            unit: p.unit
          }))
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل التعرف على الصورة');
      }

      setReasoning(data.reasoning || null);
      setConfidence(data.confidence || 85);

      if (data.matchedProductId) {
        const found = products.find(p => p.id === data.matchedProductId);
        if (found) {
          setMatchedProduct(found);
        }
      }

      if (Array.isArray(data.candidateProductIds) && data.candidateProductIds.length > 0) {
        const candidates = data.candidateProductIds
          .map((id: string) => products.find(p => p.id === id))
          .filter(Boolean) as Product[];
        setCandidateProducts(candidates);
      } else if (!data.matchedProductId) {
        // Fallback candidates if no direct match
        setCandidateProducts(products.slice(0, 4));
      }

    } catch (err: any) {
      console.warn('AI identification error, fallback to local match:', err);
      setErrorMsg(err?.message || 'حدث خطأ في خدمة الذكاء الاصطناعي');
      // Show first products as candidate list
      setCandidateProducts(products.slice(0, 4));
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in text-right">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>البحث بالذكاء الاصطناعي عن طريق الصورة</span>
              </h3>
              <p className="text-xs text-indigo-200">التقط صورة للمنتج أو ارفعها للتعرف عليه في المخزن فوراً</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {!selectedImage && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5 gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>رفع صورة منتج من الجهاز</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>التقاط صورة بالكاميرا الحية</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Capture or Select Image */}
          {!selectedImage ? (
            activeTab === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 rounded-3xl p-8 text-center bg-indigo-50/40 dark:bg-indigo-950/20 transition-all cursor-pointer space-y-3 group"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                    اضغط هنا لاختيار صورة المنتج من الاستوديو أو الملفات
                  </p>
                  <p className="text-xs text-slate-500">
                    يدعم صور JPG، PNG، WebP لغلاف العبوة أو المنتج
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* Camera view */
              <div className="space-y-4">
                {/* Auto Scan Toggle Switch */}
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    <div className="text-right">
                      <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">المسح التلقائي المستمر الذكي (كأنه قارئ باركود)</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">وجه الكاميرا نحو المنتج، وسيقوم النظام بالتعرف عليه وإضافته للسلة تلقائياً دون أي نقرات!</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoScanning(!isAutoScanning);
                      setScanStatusMsg(null);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isAutoScanning ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isAutoScanning ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                  
                  {/* Camera Scan Frame Overlay */}
                  <div className="absolute inset-8 border-2 border-dashed border-indigo-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
                    <ScanLine className="w-12 h-12 text-indigo-400 opacity-60 animate-bounce" />
                  </div>

                  {/* Auto Scan Status indicator overlay */}
                  <div className="absolute top-3 right-3 bg-slate-900/80 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-2 backdrop-blur-md">
                    <span className={`w-2.5 h-2.5 rounded-full ${isAutoScanning ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
                    <span className="text-[10px] font-bold text-white">
                      {isAutoScanning ? 'المسح التلقائي نشط ⚡' : 'المسح التلقائي متوقف'}
                    </span>
                  </div>

                  {/* Camera Flip Quick Badge Overlay */}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="absolute top-3 left-3 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1 shadow-lg cursor-pointer transition-all active:scale-95 z-10"
                  >
                    <FlipHorizontal className="w-3 h-3 text-indigo-300" />
                    <span>{facingMode === 'environment' ? 'خلفية 📷' : 'أمامية 🤳'}</span>
                  </button>

                  {/* Continuous scan current status message banner */}
                  {scanStatusMsg && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-indigo-950/95 border border-indigo-500/40 text-indigo-200 text-xs font-bold px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 z-15 whitespace-nowrap animate-pulse">
                      <Sparkles className="w-4 h-4 text-indigo-300 animate-spin" />
                      <span>{scanStatusMsg}</span>
                    </div>
                  )}

                  {/* Cooldown timer overlay */}
                  {cooldownRemaining > 0 && !scannedProductOverlay && (
                    <div className="absolute inset-0 bg-indigo-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in z-25">
                      <div className="w-16 h-16 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <Sparkles className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h4 className="font-extrabold text-base text-white mb-2">الرجاء الانتظار {cooldownRemaining} ثانية...</h4>
                      <p className="text-[11px] text-indigo-200/90 max-w-sm leading-relaxed">
                        تمت الإضافة بنجاح! يرجى إبعاد المنتج الحالي وتوجيه الكاميرا نحو المنتج التالي لتفادي التكرار التلقائي.
                      </p>
                    </div>
                  )}

                  {/* Scanned product visual success alert */}
                  {scannedProductOverlay && (
                    <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                      <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4 animate-scale-up">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h4 className="font-black text-lg text-emerald-300 mb-1">تمت الإضافة للسلة!</h4>
                      <p className="font-extrabold text-base text-white mb-2">{scannedProductOverlay.name}</p>
                      <div className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-full">
                        {scannedProductOverlay.sellingPrice.toFixed(2)} {settings.currencySymbol}
                      </div>
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-sm flex items-center justify-center p-4">
                      {errorMsg ? (
                        <div className="w-full max-w-md bg-slate-950/80 border border-red-500/20 rounded-2xl p-5 text-right space-y-4 shadow-xl">
                          <div className="flex items-center gap-2.5 text-rose-400">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <h4 className="font-extrabold text-sm">تم حجب الكاميرا بواسطة المتصفح 🔒</h4>
                          </div>
                          
                          <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                            لحمايتك، تمنع بعض الهواتف والمتصفحات تشغيل الكاميرا تلقائياً داخل النوافذ المضمنة (iFrames) في منصة التطوير.
                          </p>

                          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2 text-[11px] text-slate-200">
                            <div className="flex items-start gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-indigo-900 text-indigo-200 flex items-center justify-center font-black shrink-0 text-[10px]">١</span>
                              <span>انقر على زر <strong>"فتح في تبويب خارجي ↗️"</strong> الموجود في أعلى شريط المعاينة.</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-indigo-900 text-indigo-200 flex items-center justify-center font-black shrink-0 text-[10px]">٢</span>
                              <span>اضغط على <strong>"سماح"</strong> (Allow) فور طلب إذن الكاميرا من المتصفح.</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-indigo-900 text-indigo-200 flex items-center justify-center font-black shrink-0 text-[10px]">٣</span>
                              <span>اختر <strong>"تذكر خياري"</strong> لمنح الإذن الدائم والتلقائي في المستقبل.</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => startCamera(selectedDeviceId, facingMode)}
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>إعادة المحاولة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                stopCamera();
                                resetState();
                                setActiveTab('upload');
                              }}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-[11px] rounded-xl transition-colors cursor-pointer"
                            >
                              رفع صورة بدلاً من ذلك
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white space-y-3 p-4">
                          <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                          <p className="text-xs font-bold text-indigo-200">جاري تشغيل عدسة الكاميرا الذكية...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Camera Selection Dropdown if multiple devices found */}
                {cameras.length > 1 && (
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <FlipHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
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

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="px-4 py-3 bg-indigo-100 dark:bg-indigo-950/50 hover:bg-indigo-200 text-indigo-950 dark:text-indigo-200 font-bold rounded-2xl transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs"
                    title="تبديل الكاميرا (أمامية / خلفية)"
                  >
                    <FlipHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>تبديل الكاميرا {facingMode === 'environment' ? '(أمامية 🤳)' : '(خلفية 📷)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={!cameraActive || isAnalyzing}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg transition-all cursor-pointer active:scale-95 text-xs"
                  >
                    <Camera className="w-5 h-5 animate-pulse" />
                    <span>التقاط وإضافة فورية للسلة ⚡</span>
                  </button>
                </div>

                {/* Iframe Camera Permission Hint */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                  💡 <strong>ملاحظة للموبايل:</strong> إذا كنت تستخدم التطبيق من داخل إطار المعاينة بالموبايل ولم تظهر الكاميرا الخلفية، انقر على زر <strong>"فتح في نافذة جديدة ↗️"</strong> أعلى شريط المعاينة للحصول على صلاحيات الكاميرات كاملة.
                </p>
              </div>
            )
          ) : (
            /* Selected / Captured Image Preview & Results */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shrink-0 shadow-sm">
                  <img
                    src={selectedImage}
                    alt="صورة المنتج الملتقطة"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">الصورة المستخدمة للفحص</span>
                    <button
                      onClick={resetState}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>تغيير الصورة</span>
                    </button>
                  </div>

                  {isAnalyzing && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 animate-pulse">
                        <Sparkles className="w-4 h-4" />
                        <span>جاري فحص الصورة ومطابقتها بالذكاء الاصطناعي...</span>
                      </div>
                      <div className="w-full bg-indigo-100 dark:bg-indigo-950 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full animate-pulse w-3/4"></div>
                      </div>
                    </div>
                  )}

                  {!isAnalyzing && reasoning && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed font-semibold">
                      💡 {reasoning}
                    </p>
                  )}
                </div>
              </div>

              {/* Matched Product Result */}
              {!isAnalyzing && matchedProduct && (
                <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 border border-emerald-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>تم التعرف على المنتج بنجاح!</span>
                    </div>

                    {confidence !== null && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full">
                        نسبة المطابقة: {confidence}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {matchedProduct.image ? (
                        <img
                          src={matchedProduct.image}
                          alt={matchedProduct.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/30 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-emerald-900/60 text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/30 shrink-0">
                          {matchedProduct.name[0]}
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-base text-white">{matchedProduct.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-emerald-200/80">
                          <span>الباركود: <strong className="font-mono">{matchedProduct.barcode}</strong></span>
                          <span>|</span>
                          <span>التصنيف: <strong>{matchedProduct.category}</strong></span>
                        </div>
                        <p className="text-xs font-mono font-bold text-emerald-300">
                          السعر: {matchedProduct.sellingPrice.toFixed(2)} {settings.currencySymbol} / {matchedProduct.unit}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(matchedProduct);
                        onClose();
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2 text-xs shrink-0 hover:scale-105 active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>إختيار / إضافة للسلة</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Candidates list if any or if no main match */}
              {!isAnalyzing && candidateProducts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-600 dark:text-slate-400">
                    {matchedProduct ? 'منتجات مشاطرة أخرى قد تطابق الصورة:' : 'اختر المنتج من بين المرشحات التالية:'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {candidateProducts.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => {
                          onSelectProduct(prod);
                          onClose();
                        }}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer hover:shadow-md group"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
                              {prod.name[0]}
                            </div>
                          )}

                          <div className="space-y-0.5 overflow-hidden">
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600">
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {prod.sellingPrice.toFixed(2)} {settings.currencySymbol}
                            </p>
                          </div>
                        </div>

                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:-translate-x-1 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message if API error */}
              {!isAnalyzing && errorMsg && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">
            إجمالي أصناف المحل: {products.length} صنف
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
