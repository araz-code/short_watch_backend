import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import Header from "../components/Header";

const errorMessage = (error: unknown): string => {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return "Unknown error";
  }
};

const ErrorPage: React.FC = () => {
  const error: unknown = useRouteError();

  return (
    <div className="flex flex-col h-screen text-gray-800 dark:text-white">
      <Header />
      <div className="flex flex-col flex-grow items-center justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold pb-5">Oops!</h1>
        <p className="pb-2">Sorry, an unexpected error has occurred.</p>
        <p>
          <i>{errorMessage(error)}</i>
        </p>
      </div>
    </div>
  );
};

export default ErrorPage;
