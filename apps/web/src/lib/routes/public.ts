const useV2 = process.env.NEXT_PUBLIC_UI_VERSION === "v2";

export function getPublicHref(path: string) {
  if (!useV2) {
    return path;
  }

  if (path.startsWith("/v2")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `/v2${path}`;
  }

  return `/v2/${path}`;
}
