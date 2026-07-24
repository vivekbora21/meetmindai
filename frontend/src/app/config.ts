export const getApiUrl = (path: string): string => {
  if (typeof window === "undefined") {
    return `http://localhost:8000${path}`;
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:8000${path}`;
};

export const getWsUrl = (path: string): string => {
  if (typeof window === "undefined") {
    return `ws://localhost:8000${path}`;
  }
  const hostname = window.location.hostname;
  return `ws://${hostname}:8000${path}`;
};

export const ensureUTCSuffix = (isoStr: string | null | undefined): string => {
  if (!isoStr) return new Date().toISOString();
  const normalized = isoStr.replace(" ", "T");
  if (!normalized.endsWith("Z") && !normalized.match(/[+-]\d{2}:?\d{2}$/)) {
    return normalized + "Z";
  }
  return normalized;
};

export const parseUTCDate = (isoStr: string | null | undefined): Date => {
  return new Date(ensureUTCSuffix(isoStr));
};

