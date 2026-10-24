import { v2 as cloudinary } from 'cloudinary';
import type { UploadSignatureDto } from '@a3/contracts';
import { config } from '../../config';
import { AppError } from '../../utils/app-error';

export const UPLOAD_FOLDERS = ['products', 'categories', 'banners'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
const MAX_BYTES = 5 * 1024 * 1024; // docs/SECURITY.md §8

function credentials() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = config();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError('SERVICE_UNAVAILABLE', 503, 'Image uploads are not configured on this server.');
  }
  return { cloudName, apiKey, apiSecret };
}

/**
 * Signed direct-to-Cloudinary upload (admin only). The secret never leaves the server;
 * the signature pins folder and formats so the browser can't widen them. File size (≤5 MB)
 * is checked by the dashboard before upload; set an upload preset limit in Cloudinary too.
 */
export function signUpload(folder: UploadFolder): UploadSignatureDto {
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    timestamp,
    folder: `a3-kitchen/${folder}`,
    allowed_formats: ALLOWED_FORMATS,
  };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: params.folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

export const uploadLimits = { allowedFormats: ALLOWED_FORMATS.split(','), maxBytes: MAX_BYTES };

/** Only accept image URLs from our own Cloudinary account. */
export function assertOwnImageUrl(url: string): void {
  const cloudName = config().CLOUDINARY_CLOUD_NAME;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('VALIDATION_ERROR', 400, 'Image URL is not valid.');
  }
  const ours = parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com' && parsed.pathname.startsWith(`/${cloudName}/`);
  if (!cloudName || !ours) throw new AppError('VALIDATION_ERROR', 400, 'Images must be uploaded through the A3 Kitchen dashboard.');
}
