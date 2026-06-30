import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export const publicDir = path.join(process.cwd(), "public");

export async function generateDashboard(): Promise<void> {
  const frontendDir = path.join(process.cwd(), "frontend");
  await execAsync("npm run build", { cwd: frontendDir });
}
