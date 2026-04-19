import { useEffect } from "react";

export function useSEO(title: string, description?: string) {
  useEffect(() => {
    document.title = "Zirium | " + title;

    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content", description);
      }
    }

    return () => {
      document.title = "Zirium | Danish Short Watch";
    };
  }, [title, description]);
}
