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
