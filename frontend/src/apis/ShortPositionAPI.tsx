import { QueryClient } from "@tanstack/react-query";
import { logException } from "../analytics";

export const queryClient = new QueryClient();

const isLocal = false;
export const HOST = isLocal ? "http://localhost:8000" : "https://www.zirium.dk";
export const VERSION = "v18";

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

export interface InsiderIssuer {
  cvr: string;
  name: string;
  lei: string;
  symbol: string;
  transaction_count: number;
  latest_date: string | null;
  earliest_date: string | null;
  updated_at: string;
}

export interface InsiderTransaction {
  id: number;
  announcement_id: string;
  published_date: string;
  person_name: string;
  person_role: string;
  person_role_da: string;
  closely_associated_to: string;
  transaction_type: string;
  transaction_category: "buy" | "sell" | "grant" | "other";
  instrument_type: string;
  instrument_name: string;
  isin: string;
  transaction_date: string | null;
  volume: number | null;
  unit_price: number | null;
  currency: string;
  total_amount: number | null;
  venue: string;
  source_url: string;
  extraction_notes: string;
  extraction_notes_da: string;
}

export interface InsiderSignal {
  signal: "bullish" | "bearish" | "neutral";
  buy_amount_90d: number;
  sell_amount_90d: number;
}

export interface InsiderIssuerDetail extends InsiderIssuer {
  transactions: InsiderTransaction[];
  signal: InsiderSignal;
}

export async function fetchInsiderIssuers({ signal }: { signal?: AbortSignal }): Promise<InsiderIssuer[]> {
  const url = `${HOST}/${VERSION}/insider/issuers`;
  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch insider issuers");
  return response.json();
}

export async function fetchInsiderIssuerDetail({ signal, cvr }: { signal?: AbortSignal; cvr: string }): Promise<InsiderIssuerDetail> {
  const url = `${HOST}/${VERSION}/insider/issuers/${cvr}`;
  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch insider issuer detail");
  return response.json();
}

export interface RecentFeedItem {
  type: 'large_seller' | 'insider';
  date: string;
  stockSymbol: string;
  stockCode?: string;
  stockName?: string;
  value?: number | null;
  prevValue?: number | null;
  sellerName?: string;
  sellerId?: string;
  issuerName?: string;
  issuerCvr?: string;
  personName?: string;
  transactionCategory?: 'buy' | 'sell' | 'grant' | 'other';
  totalAmount?: number | null;
  currency?: string;
}

export async function fetchRecentFeed({
  signal,
  code,
  codes,
  types,
  days,
}: {
  signal?: AbortSignal;
  code?: string;
  codes?: string[];
  types?: 'all' | 'insider';
  days?: number;
}): Promise<RecentFeedItem[]> {
  const params = new URLSearchParams();
  if (code) params.set('code', code);
  else if (codes && codes.length > 0) params.set('codes', codes.join(','));
  if (types && types !== 'all') params.set('types', types);
  if (days) params.set('days', String(days));
  const query = params.toString();
  const url = `${HOST}/${VERSION}/shorts/recent-feed${query ? '?' + query : ''}`;
  const response = await fetch(url, {
    signal,
    headers: { Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}` },
  });
  if (!response.ok) throw new Error('Failed to fetch recent feed');
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
