"use client";

export function buildUrlWithUpdatedSearchParams(
  pathname: string,
  currentSearchParams: URLSearchParams | { toString(): string },
  updates: Record<string, string | null | undefined>
) {
  const params = new URLSearchParams(currentSearchParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
