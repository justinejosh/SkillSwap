import sharp from "sharp";
import { createHash } from "node:crypto";
import { HttpError } from "../lib/http";
import { EVIDENCE_MAX_BYTES } from "./privateEvidenceStorage";

export async function sanitizeEvidence(bytes: Buffer, claimedMime: string) {
  if (!bytes.length || bytes.length > EVIDENCE_MAX_BYTES) throw new HttpError(413, "Choose one image no larger than 5 MB.");
  const format = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? "jpeg"
    : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  if (!format || claimedMime !== `image/${format}`) throw new HttpError(422, "Choose a genuine JPG, PNG or WebP image with the correct file type.");
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning", sequentialRead: true, animated: false });
    const meta = await image.metadata();
    if (meta.format !== format || !meta.width || !meta.height || meta.width > 8000 || meta.height > 8000 || meta.width * meta.height > 16_000_000 || (meta.pages || 1) !== 1)
      throw new Error("Unsupported dimensions or animation.");
    // Full decode + re-encode strips EXIF/GPS/ICC and trailing payloads. Merely
    // reading metadata would not establish that compressed pixels are valid.
    const { data, info } = await image.rotate().webp({ quality: 85, effort: 3 }).timeout({ seconds: 10 }).toBuffer({ resolveWithObject: true });
    if (!data.length || data.length > EVIDENCE_MAX_BYTES) throw new HttpError(413, "The processed image exceeds 5 MB. Choose a smaller image.");
    return { bytes: data, mimeType: "image/webp", byteLength: data.length, width: info.width, height: info.height, sha256: createHash("sha256").update(data).digest("hex") };
  } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(422, "The image could not be safely decoded. Use a smaller, valid, non-animated JPG, PNG or WebP image."); }
}
