import { api } from "./api";

export function isRemoteMediaUrl(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/uploads/") ||
    url.startsWith("/api/")
  );
}

export function isLocalMediaUri(uri: string): boolean {
  return uri.startsWith("file:") || uri.startsWith("content:");
}

export async function uploadLrPhotos(photos: string[]): Promise<string[]> {
  const uploaded: string[] = [];

  for (const photo of photos) {
    if (!photo) continue;

    if (isRemoteMediaUrl(photo)) {
      uploaded.push(photo);
      continue;
    }

    // Native multipart upload only understands file:// / content:// URIs.
    // A data: URI (or any other scheme) passed to it crashes with a native
    // "Unsupported FormDataPart implementation" error instead of a catchable
    // JS error, so reject it up front with a clear message.
    if (!isLocalMediaUri(photo)) {
      throw new Error(
        "One of the goods photos couldn't be uploaded. Please remove it and re-add it from the camera or gallery.",
      );
    }

    const res = await api.uploadPhoto(photo);
    if (!res.success || !res.data?.url) {
      throw new Error(res.error || "Failed to upload photo");
    }
    uploaded.push(res.data.url);
  }

  return uploaded;
}

export async function resolveSignatureUrl(signature: string): Promise<string> {
  if (!signature) {
    throw new Error("Executive signature is required");
  }

  if (isRemoteMediaUrl(signature)) {
    return signature;
  }

  if (signature.startsWith("data:") || isLocalMediaUri(signature)) {
    const res = await api.uploadSignature(signature);
    if (!res.success || !res.data?.url) {
      throw new Error(res.error || "Failed to upload signature");
    }
    return res.data.url;
  }

  throw new Error("Invalid signature format");
}
