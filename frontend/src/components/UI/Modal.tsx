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
  }>
> = ({ children, title, closeButtonTitle, okButtonTitle, onOk, onClose }) => {
  const { t } = useTranslation();

  return createPortal(
    <>
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
        <div className="relative w-auto my-6 mx-auto max-w-3xl ">
          {/*content*/}
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none dark:bg-[#212121] dark:text-white">
            {/*header*/}
            <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
              <h3 className="text-xl font-semibold">{title}</h3>
              <button
                className="p-1 ml-auto bg-red border-0 float-right text-3xl leading-none font-semibold outline-none focus:outline-none text-black"
                onClick={onClose}
              >
                <span className="bg-transparent text-black h-6 w-6 text-2xl block outline-none focus:outline-none dark:text-white">
                  ×
                </span>
              </button>
            </div>
            {/*body*/}
            <div className="relative p-6 flex-auto">
              <div className="my-4 text-blueGray-500 text-lg leading-relaxed max-h-[300px] overflow-y-auto ">
                {children}
              </div>
            </div>
            {/*footer*/}
            <div className="flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b">
              {okButtonTitle ? (
                <button
                  className="text-blue-500 background-transparent font-medium px-6 py-2 outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={onOk}
                >
                  {t(okButtonTitle!)}
                </button>
              ) : undefined}
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
      <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
    </>,
    document.getElementById("modal")!
  );
};

export default Modal;
