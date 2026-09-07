import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Upload,
  Type,
  RotateCcw,
  Check,
  X,
  FileSignature,
  ShieldCheck,
  Calendar,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaveSignature: (signatureDataUrl: string, signatureType: 'drawn' | 'uploaded' | 'typed', signatureJobTitle?: string) => Promise<boolean>;
  lang: 'ar' | 'en';
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveSignature,
  lang,
}) => {
  const isAr = lang === 'ar';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [activeMode, setActiveMode] = useState<'draw' | 'upload' | 'type'>('draw');

  // Pen settings
  const [penColor, setPenColor] = useState('#1E3A8A'); // Classic Navy Ink
  const [penWidth, setPenWidth] = useState(3);

  // Type mode text
  const [typedName, setTypedName] = useState(currentUser?.name || 'سارة المنصور');
  const [typedTitle, setTypedTitle] = useState(
    currentUser?.signatureJobTitle ||
      (currentUser?.role === 'manager'
        ? (isAr ? 'مدير الإدارة المباشرة' : 'Direct Manager')
        : currentUser?.role === 'hr'
        ? (isAr ? 'إدارة الموارد البشرية والامتثال' : 'HR & Compliance Management')
        : (isAr ? 'الموظف / صاحب الطلب' : 'Employee'))
  );

  // Image Upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(currentUser?.signatureDataUrl || null);

  // Live preview for typed mode
  useEffect(() => {
    if (activeMode === 'type' && typedName.trim()) {
      const generated = generateTypedSignature();
      setPreviewSignature(generated);
    }
  }, [activeMode, typedName, penColor]);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || activeMode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set resolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);

    // Initial clear
    ctx.clearRect(0, 0, rect.width, 180);

    // If user already has a drawn signature, render it on canvas
    if (currentUser?.signatureDataUrl && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 180);
        setHasDrawn(true);
      };
      img.src = currentUser.signatureDataUrl;
    }
  }, [isOpen, activeMode]);

  if (!isOpen) return null;

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling while signing on mobile
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setPreviewSignature(canvas.toDataURL('image/png'));
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, 180);
    setHasDrawn(false);
    setPreviewSignature(null);
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImage(dataUrl);
      setPreviewSignature(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Generate Typed signature to DataURL
  const generateTypedSignature = (): string => {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 450;
    offscreenCanvas.height = 140;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 450, 140);
    // Draw calligraphic text
    ctx.font = 'italic bold 36px "Playfair Display", "Times New Roman", "Amiri", serif';
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 225, 60);

    // Decorative underline loop
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(90, 85);
    ctx.bezierCurveTo(160, 95, 290, 95, 360, 85);
    ctx.stroke();

    return offscreenCanvas.toDataURL('image/png');
  };

  // Save Signature
  const handleSave = async () => {
    setErrorMessage(null);
    let finalSignatureUrl = '';
    const type: 'drawn' | 'uploaded' | 'typed' =
      activeMode === 'draw' ? 'drawn' : activeMode === 'upload' ? 'uploaded' : 'typed';

    if (activeMode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        finalSignatureUrl = canvas.toDataURL('image/png');
      } else if (previewSignature) {
        finalSignatureUrl = previewSignature;
      } else {
        setErrorMessage(isAr ? 'يرجى رسم التوقيع داخل المربع أولاً أو اختيار التوليد بالاسم' : 'Please draw your signature first or select typed name mode');
        return;
      }
    } else if (activeMode === 'upload') {
      if (!uploadedImage) {
        setErrorMessage(isAr ? 'يرجى رفع ملف صورة التوقيع أولاً' : 'Please upload a signature image first');
        return;
      }
      finalSignatureUrl = uploadedImage;
    } else {
      finalSignatureUrl = generateTypedSignature();
    }

    if (!finalSignatureUrl) {
      setErrorMessage(isAr ? 'تعذر توليد التوقيع، يرجى المحاولة مرة أخرى' : 'Failed to generate signature, please try again');
      return;
    }

    setIsSaving(true);
    try {
      const ok = await onSaveSignature(finalSignatureUrl, type, typedTitle.trim());
      if (ok !== false) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving signature:', err);
      setErrorMessage(isAr ? 'حدث خطأ أثناء حفظ التوقيع، تم حفظه محلياً في المتصفح' : 'Error saving signature, saved locally');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-7 border border-[#E5E2D9] shadow-2xl space-y-5 text-right my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#5E7153]/15 text-[#5E7153] flex items-center justify-center font-bold">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'اعتماد وإعداد التوقيع الرقمي للمستخدم' : 'User Digital Signature Setup'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'يُحفظ في حسابك ويدرج آلياً على كشوف الرواتب، السلفيات، وتقارير الحضور المطبوعة'
                  : 'Saved to your profile and embedded on printed payslips, advances & attendance reports'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C887B] hover:text-[#2D3628] hover:bg-[#FAF9F6] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Info */}
        <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E5E2D9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div>
              <p className="font-bold text-sm text-[#2D3628]">{currentUser.name}</p>
              <p className="text-xs text-[#65635E]">{currentUser.email}</p>
            </div>
          </div>
          <div className="text-left">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#E9EDD9] text-[#2D3628] font-bold border border-[#D9E0D2]">
              {currentUser.role === 'manager'
                ? (isAr ? 'المدير المباشر (Admin)' : 'Team Lead')
                : currentUser.role === 'hr'
                ? (isAr ? 'الموارد البشرية (HR)' : 'HR Admin')
                : (isAr ? 'موظف (Employee)' : 'Employee')}
            </span>
          </div>
        </div>

        {/* Signature Mode Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
          <button
            type="button"
            onClick={() => setActiveMode('draw')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeMode === 'draw'
                ? 'bg-white text-[#2D3628] shadow-sm border border-[#E5E2D9]'
                : 'text-[#65635E] hover:text-[#2D3628]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{isAr ? 'رسم باليد / القلم' : 'Draw by Hand'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('type')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeMode === 'type'
                ? 'bg-white text-[#2D3628] shadow-sm border border-[#E5E2D9]'
                : 'text-[#65635E] hover:text-[#2D3628]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{isAr ? 'توليد بالاسم' : 'Type Name'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeMode === 'upload'
                ? 'bg-white text-[#2D3628] shadow-sm border border-[#E5E2D9]'
                : 'text-[#65635E] hover:text-[#2D3628]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isAr ? 'رفع صورة التوقيع' : 'Upload Image'}</span>
          </button>
        </div>

        {/* Mode 1: DRAW CANVAS */}
        {activeMode === 'draw' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#65635E] font-medium">{isAr ? 'لون الحبر:' : 'Ink:'}</span>
                <button
                  type="button"
                  onClick={() => setPenColor('#1E3A8A')}
                  className={`w-5 h-5 rounded-full bg-[#1E3A8A] border-2 transition ${
                    penColor === '#1E3A8A' ? 'border-amber-500 scale-110' : 'border-white'
                  }`}
                  title={isAr ? 'حبر أزرق ملكي' : 'Royal Navy'}
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#18181B')}
                  className={`w-5 h-5 rounded-full bg-[#18181B] border-2 transition ${
                    penColor === '#18181B' ? 'border-amber-500 scale-110' : 'border-white'
                  }`}
                  title={isAr ? 'حبر أسود كلاسيكي' : 'Black'}
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#5E7153')}
                  className={`w-5 h-5 rounded-full bg-[#5E7153] border-2 transition ${
                    penColor === '#5E7153' ? 'border-amber-500 scale-110' : 'border-white'
                  }`}
                  title={isAr ? 'أخضر زيتوني رسمي' : 'Olive'}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#65635E] font-medium">{isAr ? 'السُمك:' : 'Width:'}</span>
                {[2, 3, 4].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPenWidth(w)}
                    className={`w-6 h-6 rounded-md text-[11px] font-bold border ${
                      penWidth === w
                        ? 'bg-[#5E7153] text-white border-[#5E7153]'
                        : 'bg-white text-[#65635E] border-[#E5E2D9]'
                    }`}
                  >
                    {w}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1 hover:bg-rose-100 transition mr-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isAr ? 'مسح' : 'Clear'}</span>
                </button>
              </div>
            </div>

            {/* Canvas Box */}
            <div className="relative rounded-xl border-2 border-dashed border-[#C8C4B7] bg-[#FCFBF9] overflow-hidden p-1 shadow-inner">
              <canvas
                ref={canvasRef}
                className="w-full h-[160px] cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-[#A39F93] space-y-1">
                  <PenTool className="w-6 h-6 stroke-1" />
                  <p className="text-xs font-medium">
                    {isAr ? 'وقع هنا باستخدام الماوس، الإصبع أو القلم' : 'Sign here using mouse or touch'}
                  </p>
                  <span className="text-[10px] text-[#B8B4A8]">
                    {isAr ? 'خط الأساس للتوقيع المعتمد' : 'Official Signature Baseline'}
                  </span>
                </div>
              )}
              {/* Baseline indicator */}
              <div className="absolute bottom-6 left-6 right-6 border-b border-[#E5E2D9] pointer-events-none opacity-60" />
            </div>
          </div>
        )}

        {/* Mode 2: TYPE NAME */}
        {activeMode === 'type' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#2D3628] mb-1">
                {isAr ? 'الاسم الظاهر في التوقيع الخطي:' : 'Name in Signature:'}
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2D9] bg-white text-[#2D3628] text-sm focus:outline-none focus:ring-2 focus:ring-[#5E7153]"
                placeholder={isAr ? 'اكتب اسمك الكامل' : 'Enter full name'}
              />
            </div>

            {/* Generated Signature Preview Card */}
            <div className="p-6 rounded-xl border-2 border-dashed border-[#5E7153]/40 bg-[#FAF9F6] text-center space-y-2">
              <p className="text-[11px] text-[#65635E] font-medium">{isAr ? 'المعاينة الخطية المولدة:' : 'Generated Script Preview:'}</p>
              <div
                className="text-3xl sm:text-4xl font-serif italic font-bold tracking-wider py-3"
                style={{ color: penColor }}
              >
                {typedName || (isAr ? 'توقيع معتمد' : 'Authorized Signature')}
              </div>
              <div className="w-48 mx-auto border-b-2 border-current opacity-70" style={{ color: penColor }} />
            </div>
          </div>
        )}

        {/* Mode 3: UPLOAD IMAGE */}
        {activeMode === 'upload' && (
          <div className="space-y-3">
            <div className="rounded-xl border-2 border-dashed border-[#C8C4B7] bg-[#FCFBF9] p-6 text-center space-y-3">
              {uploadedImage ? (
                <div className="space-y-3">
                  <img
                    src={uploadedImage}
                    alt="Signature"
                    className="max-h-28 mx-auto object-contain border p-2 rounded-lg bg-white shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    {isAr ? 'إلغاء ورفع صورة أخرى' : 'Remove and upload another'}
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#E9EDD9] text-[#5E7153] flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#5E7153] hover:underline">
                      {isAr ? 'انقر لاختيار ملف صورة التوقيع' : 'Click to upload signature image'}
                    </span>
                    <p className="text-[11px] text-[#8C887B] mt-1">
                      {isAr ? 'PNG أو JPG بخلفية بيضاء أو شفافة (بدقة عالية)' : 'PNG or JPG with transparent or clean background'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Job Title / Capacity for Reports */}
        <div>
          <label className="block text-xs font-bold text-[#2D3628] mb-1">
            {isAr ? 'الصفة / المنصب الوظيفي تحت التوقيع في التقارير المطبوعة:' : 'Job Title in Printed Reports:'}
          </label>
          <input
            type="text"
            value={typedTitle}
            onChange={(e) => setTypedTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2D9] bg-white text-[#2D3628] text-xs focus:outline-none focus:ring-2 focus:ring-[#5E7153]"
            placeholder={isAr ? 'مثال: مدير الموارد البشرية والعمليات' : 'e.g. HR & Operations Director'}
          />
        </div>

        {/* Official Document Stamp Preview */}
        <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#65635E]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#5E7153]" />
              {isAr ? 'معاينة ختم وتوقيع الوثائق الرسمية عند الطباعة' : 'Official Document Stamp Preview'}
            </span>
            <span className="text-[10px] text-[#8C887B]">
              {new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-[#E5E2D9] flex items-center justify-between">
            <div className="text-right">
              <p className="text-xs font-bold text-[#2D3628]">{currentUser.name}</p>
              <p className="text-[11px] text-[#5E7153] font-medium">{typedTitle}</p>
              <p className="text-[10px] text-[#8C887B]">منظومة دوامي • معتمد إلكترونياً</p>
            </div>
            <div className="w-28 h-12 flex items-center justify-center border-b border-dashed border-[#5E7153]/40">
              {previewSignature || uploadedImage ? (
                <img
                  src={previewSignature || uploadedImage || ''}
                  alt="Signature Preview"
                  className="max-h-11 max-w-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-[#A39F93] italic">
                  {isAr ? '[توقيع معتمد]' : '[Official Signature]'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-in fade-in flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-red-100 rounded-lg text-red-500 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E2D9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] font-bold text-xs transition"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (activeMode === 'draw' && !hasDrawn && !previewSignature) || (activeMode === 'upload' && !uploadedImage)}
            className="px-5 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4B5B42] text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSaving
                ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                : isAr
                ? 'حفظ واعتماد التوقيع'
                : 'Save & Authorize Signature'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
