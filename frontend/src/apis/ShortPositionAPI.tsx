import { QueryClient } from "react-query";
import { logException } from "../analytics";

export const queryClient = new QueryClient();

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

export async function fetchShortPositions({
  signal,
  category,
}: {
  signal?: AbortSignal;
  category: string;
}) {
  const url = `https://www.zirium.dk/v11/shorts/web/${category}`;

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
  const url = `https://www.zirium.dk/v11/shorts/web/${category}/details/${code}`;

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
  const url = `https://www.zirium.dk/v11/users/web-consent`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${"CK1OkkoF.2t0M6oZMc186nNJFlZdNOMxWC0u3YCQ5"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consentId,
        consentAccepted,
      }),
    });
  } catch (error) {
    logException(`updateConsent failed: ${error}`);
  }
}

export async function statusCheck(consentId: string) {
  const url = `https://www.zirium.dk/v11/users/status-check`;

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
