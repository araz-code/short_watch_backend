import { PropsWithChildren } from "react";
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
  }>
> = ({
  children,
  title,
  closeButtonTitle,
  okButtonTitle,
  onOk,
  onClose,
  enableXClose,
}) => {
  const { t } = useTranslation();

  return createPortal(
    <>
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
        <div className="relative w-auto my-6 mx-auto max-w-3xl ">
          {/*content*/}
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none dark:bg-[#212121] dark:text-white dark:border">
            {/*header*/}
            <div className="flex items-start justify-between px-6 py-3 border-b border-solid border-blueGray-200 rounded-t-lg bg-[#0d1b4c] text-white">
              <h3 className="text-xl font-semibold">{title}</h3>
              {enableXClose && (
                <button
                  className="p-1 ml-auto bg-red border-0 float-right text-3xl leading-none font-semibold outline-none focus:outline-none text-black"
                  onClick={onClose}
                >
                  <span className="bg-transparent h-6 w-6 text-2xl block outline-none focus:outline-none  text-white">
                    ×
                  </span>
                </button>
              )}
            </div>
            {/*body*/}
            <div className="relative px-6 flex-auto">
              <div className="my-4 text-blueGray-500 text-lg leading-relaxed max-h-[300px] overflow-y-auto ">
                {children}
              </div>
            </div>
            {/*footer*/}
            <div className="flex items-center justify-end px-6 py-2 border-t border-solid border-blueGray-200 rounded-b">
              {okButtonTitle && (
                <button
                  className="text-blue-500 background-transparent font-medium px-6 py-2 outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={onOk}
                >
                  {t(okButtonTitle!)}
                </button>
              )}
              <button
                className="text-blue-500 background-transparent font-medium px-6 py-2 outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={onClose}
              >
                {t(closeButtonTitle)}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="opacity-25 dark:opacity-50 fixed inset-0 z-40 bg-black"></div>
    </>,
    document.getElementById("modal")!
  );
};

export default Modal;
