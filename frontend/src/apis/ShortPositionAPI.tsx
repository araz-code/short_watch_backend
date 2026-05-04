import { QueryClient } from "@tanstack/react-query";
import { logException } from "../analytics";

export const queryClient = new QueryClient();

const isLocal = false;
export const HOST = isLocal ? "http://localhost:8000" : "https://www.zirium.dk";
const VERSION = "v18";

class FetchError extends Error {
  code: number;
  info: unknown;

  constructor(message: string, code: number, info: unknown) {
    super(message);
    this.code = code;
    this.info = info;
    this.name = "FetchError";
  }
}

function getCSRFToken() {
  const name = "csrftoken";
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name + "=")) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

export async function fetchShortPositions({
  signal,
  category,
}: {
  signal?: AbortSignal;
  category: string;
}) {
  const url = `${HOST}/${VERSION}/shorts/web/${category}`;

  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });

  if (!response.ok) {
    const info = await response.json();
    const error = new FetchError(
      "An error occurred while fetching the events",
      response.status,
      info
    );
    throw error;
  }

  const shorts = await response.json();

  return shorts;
}

export async function fetchShortPositionDetails({
  signal,
  category,
  code,
}: {
  signal?: AbortSignal;
  category: string;
  code: string;
}) {
  const url = `${HOST}/${VERSION}/shorts/web/${category}/details/${code}`;

  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });

  if (!response.ok) {
    const info = await response.json();
    const error = new FetchError(
      "An error occurred while fetching the events",
      response.status,
      info
    );
    throw error;
  }

  const shortDetails = await response.json();

  return shortDetails;
}

export async function updateConsent(
  consentId: string,
  consentAccepted: boolean
) {
  const url = `${HOST}/${VERSION}/users/web-consent`;

  const csrfToken = getCSRFToken();

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
        "Content-Type": "application/json",
        ...(csrfToken && { "X-CSRFToken": csrfToken }),
      },
      body: JSON.stringify({
        consentId,
        consentAccepted,
      }),
      ...(csrfToken && { credentials: "include" }),
    });
  } catch (error) {
    logException(`updateConsent failed: ${error}`);
  }
}

export async function statusCheck(consentId: string) {
  const url = `${HOST}/${VERSION}/users/status-check`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consentId,
      }),
    });
  } catch (error) {
    logException(`updateConsent failed: ${error}`);
  }
}

export async function fetchLargestShortSellers({
  signal,
}: {
  signal?: AbortSignal;
}) {
  const url = `${HOST}/${VERSION}/shorts/web/short-sellers`;

  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });

  if (!response.ok) {
    const info = await response.json();
    const error = new FetchError(
      "An error occurred while fetching largest short sellers",
      response.status,
      info
    );
    throw error;
  }

  const sellers = await response.json();

  return sellers;
}

export async function fetchLargeShortSellerDetails({
  signal,
  seller,
}: {
  signal?: AbortSignal;
  seller: string;
}) {
  const url = `${HOST}/${VERSION}/shorts/web/short-sellers/${seller}`;

  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });

  if (!response.ok) {
    const info = await response.json();
    const error = new FetchError(
      "An error occurred while fetching the short seller details",
      response.status,
      info
    );
    throw error;
  }

  const shortDetails = await response.json();

  return shortDetails;
}

export interface ShortStats {
  shortedCount: number;
  shortedCountDelta?: number | null;
  mostShorted: { symbol: string; name: string; code: string; value: number; prevValue?: number | null } | null;
  mostViewed: { symbol: string; name: string; code: string; views: number } | null;
  mostFollowed: { symbol: string; name: string; code: string; followers: number } | null;
  updatedAt?: string | null;
}

export interface TopListStock {
  symbol: string;
  name: string;
  code: string;
}

export interface TopListShortedStock extends TopListStock {
  value: number;
}

export interface TopListActiveStock extends TopListStock {
  updates: number;
}

export interface TopListDeltaStock extends TopListStock {
  delta: number;
  value: number;
}

export interface TopListDaysToCoverStock extends TopListStock {
  days: number;
}

export interface TopListShortSellersStock extends TopListStock {
  sellers: number;
}

export interface TopLists {
  mostViewed: TopListStock[];
  mostFollowed: TopListStock[];
  mostShorted: TopListShortedStock[];
  mostActive: TopListActiveStock[];
  mostRising: TopListDeltaStock[];
  mostFalling: TopListDeltaStock[];
  mostDaysToCover: TopListDaysToCoverStock[];
  mostShortSellers: TopListShortSellersStock[];
}

export async function fetchTopLists({ signal }: { signal?: AbortSignal }): Promise<TopLists> {
  const url = `${HOST}/${VERSION}/shorts/top-lists`;

  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch top lists");
  }

  return response.json();
}

export async function fetchStats({ signal }: { signal?: AbortSignal }): Promise<ShortStats> {
  const url = `${HOST}/${VERSION}/shorts/homepage-stats`;

  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }

  return response.json();
}
