import React, { useEffect, useState } from 'react';
import { Download, Check, WifiOff, FileCode2, Smartphone } from 'lucide-react';
import { downloadStandaloneIndexHtml } from '../utils/standaloneExporter';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isOnline,
    install,
  };
}

export const PWAInstallButton: React.FC<{ onQuickExportProject?: () => void }> = ({
  onQuickExportProject,
}) => {
  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-md"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>حالت آفلاین فعال — کتاب و ابزارهای هندسی از حافظه محلی اجرا می‌شوند</span>
        </div>
      )}

      {isInstalled ? (
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>نسخه آفلاین</span>
        </button>
      ) : isInstallable ? (
        <button
          onClick={install}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>نصب وب‌اپ</span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>نصب و فایل مستقل</span>
        </button>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 border border-slate-200 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  اپلیکیشن ترسیم (نسخه ۳.۰) — اجرای ۱۰۰٪ آفلاین و نسخه مستقل
                </h3>
                <p className="text-xs font-semibold text-sky-700 mt-0.5">
                  طراح و توسعه‌دهنده: امیرحسین رضایی
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              موتور <strong>PDF.js</strong> (شامل فایل‌های <code>pdf.min.mjs</code>، <code>pdf.worker.min.mjs</code>، دیکدرهای <code>wasm</code> و فونت‌های استاندارد) و همچنین فونت‌های فارسی <strong>Vazirmatn</strong> به طور کامل در پوشه‌های محلی <code>/public/pdfjs/</code> و <code>/public/fonts/</code> داخل همین پروژه قرار داده شده‌اند و بدون هیچ وابستگی به اینترنت روی ویندوز، گوشی و تلویزیون‌های لمسی اندروید (Touch TV) کار می‌کنند.
            </p>

            {/* Option 1: Direct Standalone index.html download */}
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                <FileCode2 className="w-4 h-4 text-sky-600" />
                <span>۱. دانلود مستقیم فایل تک‌صفحه‌ای مستقل (index.html):</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                با کلیک روی دکمه زیر، یک فایل <code>index.html</code> کاملاً مستقل دریافت می‌کنید که در ویندوز، مک، لینوکس و اندروید فقط با <strong>دابل‌کلیک مستقیم (بدون نیاز به هیچ سروری)</strong> باز می‌شود.
              </p>
              <button
                onClick={() => {
                  downloadStandaloneIndexHtml();
                }}
                className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>دانلود فایل مستقل index.html (اجرای فوری بدون سرور)</span>
              </button>
            </div>

            {/* Option 2: Android / Desktop PWA Install */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Smartphone className="w-4 h-4 text-slate-700" />
                <span>
                  {isIOS
                    ? '۲. نصب روی آیفون و آیپد (Safari):'
                    : '۲. نصب روی اندروید و کامپیوتر (PWA):'}
                </span>
              </div>
              {isIOS ? (
                <p className="text-xs text-slate-700 leading-relaxed">
                  دکمه <strong>Share</strong> را در نوار پایین مرورگر لمس کرده و گزینه <strong>Add to Home Screen</strong> را بزنید تا مانند یک اپلیکیشن بومی آفلاین نصب شود.
                </p>
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed">
                  در مرورگر کروم اندروید یا دسکتاپ گزینه <strong>Add to Home screen / Install App</strong> را بزنید تا کل برنامه به همراه کتاب هندسه ۱ به صورت آفلاین روی گوشی یا سیستم شما نصب شود.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {onQuickExportProject && (
                <button
                  onClick={() => {
                    onQuickExportProject();
                    setShowModal(false);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                >
                  ذخیره فایل پروژه فعلی
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
