import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// True when an error comes from a lazily-loaded chunk that can no longer be
// fetched. This happens to clients running an old build after a new deploy:
// the old hashed chunk files are gone, so the dynamic import() 404s. Browsers
// word this differently, so we match all the common variants.
export function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

// Reload at most once per 10s window, so a genuine (non-chunk) error that keeps
// throwing on the fresh build can never loop forever.
export function reloadForNewBuild(): boolean {
  const KEY = "chunk-reload-at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
    return true;
  }
  return false;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // A stale chunk after a deploy: pull the new build instead of showing an error.
    if (isChunkLoadError(error)) {
      reloadForNewBuild();
    }
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
