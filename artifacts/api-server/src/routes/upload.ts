import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { objectStorageClient } from "../lib/objectStorage";

const router = Router();

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: jpg, png, webp, gif, mp4, webm`));
    }
  },
});

function getExt(originalname: string): string {
  const idx = originalname.lastIndexOf(".");
  return idx >= 0 ? originalname.slice(idx).toLowerCase() : ".jpg";
}

function getLocalUploadsDir(): string {
  return path.resolve(process.cwd(), "uploads");
}

async function saveToLocalDisk(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const dir = getLocalUploadsDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  return `/api/uploads/${filename}`;
}

function parsePath(fullPath: string): { bucketName: string; objectName: string } {
  const clean = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
  const slash = clean.indexOf("/");
  if (slash < 0) return { bucketName: clean, objectName: "" };
  return { bucketName: clean.slice(0, slash), objectName: clean.slice(slash + 1) };
}

async function saveToGCS(buffer: Buffer, objectName: string, mimetype: string, objectDir: string): Promise<string> {
  const fullPath = `${objectDir}/${objectName}`;
  const { bucketName, objectName: gcsName } = parsePath(fullPath);
  const bucket = objectStorageClient.bucket(bucketName);
  const gcsFile = bucket.file(gcsName);
  await gcsFile.save(buffer, { contentType: mimetype, resumable: false });
  return `/api/storage/objects/${objectName}`;
}

// Multer error → JSON middleware
function multerErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError || err?.message?.startsWith("File type not allowed")) {
    res.status(400).json({ error: err.message || "Upload error" });
    return;
  }
  next(err);
}

// Public endpoint — no auth needed for signup document uploads
router.post("/upload", (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, async (err) => {
    // Return JSON for multer/validation errors
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided. Send a multipart/form-data request with field name 'file'." });
      return;
    }

    const ext = getExt(req.file.originalname);
    const objectId = randomUUID();
    const filename = `${objectId}${ext}`;

    try {
      const objectDir = process.env.PRIVATE_OBJECT_DIR;

      let url: string;

      if (objectDir) {
        // GCS available — upload there
        const objectName = `uploads/${filename}`;
        url = await saveToGCS(req.file.buffer, objectName, req.file.mimetype, objectDir);
        req.log.info({ filename, size: req.file.size }, "Uploaded to GCS");
      } else {
        // No GCS configured — fall back to local disk
        url = await saveToLocalDisk(req.file.buffer, filename, req.file.mimetype);
        req.log.info({ filename, size: req.file.size }, "Saved to local disk (GCS not configured)");
      }

      res.json({ url, filename });
    } catch (uploadErr: any) {
      req.log.error({ err: uploadErr }, "Upload failed");
      res.status(500).json({ error: "Upload failed. Please try again." });
    }
  });
});

// Serve locally uploaded files
router.get("/uploads/:filename", async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(getLocalUploadsDir(), filename);
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export default router;
