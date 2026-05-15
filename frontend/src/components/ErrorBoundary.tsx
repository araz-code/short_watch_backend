import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const isDa = navigator.language.startsWith("da");
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] px-6 py-12 text-center dark:text-white">
          <p className="text-4xl mb-4">!</p>
          <h2 className="text-lg font-semibold mb-2">
            {isDa ? "Noget gik galt" : "Something went wrong"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {isDa
              ? "Der opstod en uventet fejl. Prøv at genindlæse siden."
              : "An unexpected error occurred. Please try reloading the page."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
