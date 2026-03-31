import { promises as fs } from "fs";
import path from "path";

const DEFAULT_DATA = {
  totalVisits: 0,
  uniqueVisitors: 0,
  visitors: {},
  sections: {},
  feedback: [],
  updatedAt: null,
};

function getStoragePath() {
  if (process.env.VERCEL) return path.join("/tmp", "cabi-analytics.json");
  return path.join(process.cwd(), ".data", "cabi-analytics.json");
}

export async function readStore() {
  const filePath = getStoragePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export async function writeStore(data) {
  const filePath = getStoragePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}
