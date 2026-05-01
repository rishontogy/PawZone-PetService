import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { authMiddleware } from "../lib/auth";
import { objectStorageClient } from "../lib/objectStorage";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image or video files allowed"));
    }
  },
});

function getExt(originalname: string): string {
  const idx = originalname.lastIndexOf(".");
  return idx >= 0 ? originalname.slice(idx).toLowerCase() : "";
}

function getObjectsDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  return dir;
}

function parsePath(fullPath: string): { bucketName: string; objectName: string } {
  const clean = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
  const slash = clean.indexOf("/");
  if (slash < 0) return { bucketName: clean, objectName: "" };
  return { bucketName: clean.slice(0, slash), objectName: clean.slice(slash + 1) };
}

router.post("/upload", authMiddleware, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const ext = getExt(req.file.originalname);
    const objectId = randomUUID();
    const objectName = `uploads/${objectId}${ext}`;
    const fullPath = `${getObjectsDir()}/${objectName}`;
    const { bucketName, objectName: gcsName } = parsePath(fullPath);

    const bucket = objectStorageClient.bucket(bucketName);
    const gcsFile = bucket.file(gcsName);

    await gcsFile.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false,
    });

    const objectPath = `/objects/${objectName}`;
    const url = `/api/storage${objectPath}`;

    req.log.info({ objectPath, mimetype: req.file.mimetype, size: req.file.size }, "Uploaded to GCS");
    res.json({ url, objectPath, filename: `${objectId}${ext}` });
  } catch (err) {
    req.log.error({ err }, "GCS upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
