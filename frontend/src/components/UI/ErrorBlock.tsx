import React from "react";

const ErrorBlock: React.FC<{
  title: string;
  message: string;
}> = ({ title, message }) => {
  return (
    <div className="bg-red-200 my-4 p-4 rounded-md text-red-700 flex items-center">
      <div className="text-white bg-red-700 rounded-full flex justify-center items-center w-12 h-12">
        !
      </div>
      <div className="pl-3">
        <h2 className="text-red-700 text-lg font-semibold">{title}</h2>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default ErrorBlock;
