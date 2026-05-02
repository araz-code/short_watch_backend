import { PropsWithChildren, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const Modal: React.FC<
  PropsWithChildren<{
    title: string;
    closeButtonTitle: string;
    okButtonTitle?: string;
    onOk?: () => void;
    onClose: () => void;
    enableXClose: boolean;
    centerOnMobile?: boolean;
  }>
> = ({
  children,
  title,
  closeButtonTitle,
  okButtonTitle,
  onOk,
  onClose,
  enableXClose,
  centerOnMobile = false,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
        onClick={enableXClose ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-0 z-50 flex ${centerOnMobile ? "items-center" : "items-end"} sm:items-center justify-center ${centerOnMobile ? "p-4" : "p-0"} sm:p-4 pointer-events-none`}
      >
        <div className={`pointer-events-auto relative w-full sm:w-auto sm:max-w-xl bg-white dark:bg-[#1e1e1e] ${centerOnMobile ? "rounded-2xl" : "rounded-t-2xl sm:rounded-2xl"} shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]`}>
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h3>
            {enableXClose && (
              <button
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-gray-300"
                onClick={onClose}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="px-6 pb-4 overflow-y-auto text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
            {children}
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-300"
              type="button"
              onClick={onClose}
            >
              {t(closeButtonTitle)}
            </button>
            {okButtonTitle && (
              <button
                className="px-4 py-2 rounded-full text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25 focus:ring-2 focus:ring-blue-300"
                type="button"
                onClick={onOk}
              >
                {t(okButtonTitle!)}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.getElementById("modal")!
  );
};

export default Modal;
