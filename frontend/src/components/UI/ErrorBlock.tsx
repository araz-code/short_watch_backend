import React from "react";

const ErrorBlock: React.FC<{
  title: string;
  message: string;
}> = ({ title, message }) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 my-4 mx-2 p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-center">
      <div className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-full flex justify-center items-center w-10 h-10 shrink-0 text-lg font-bold">
        !
      </div>
      <div className="pl-3">
        <h2 className="text-red-700 dark:text-red-400 text-lg font-semibold">
          {title}
        </h2>
        <p className="text-red-600 dark:text-red-300 text-sm">{message}</p>
      </div>
    </div>
  );
};

export default ErrorBlock;
