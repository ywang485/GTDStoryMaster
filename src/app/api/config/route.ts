import { readFile } from "fs/promises";
import { resolve } from "path";
import type { AdventurerConfig } from "@/types/config";

/**
 * Serves the adventurer.config.json from the project root.
 * Returns {} if the file doesn't exist or is invalid.
 */
export async function GET() {
  try {
    const configPath = resolve(process.cwd(), "adventurer.config.json");
    const raw = await readFile(configPath, "utf-8");
    const config: AdventurerConfig = JSON.parse(raw);
    return Response.json(config);
  } catch {
    // File missing or invalid — return empty config
    return Response.json({});
  }
}
