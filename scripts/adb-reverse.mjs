// Tunnels the phone's/emulator's localhost:4000 to this PC's API over USB/adb
// (same approach as the driveflow project). Usage: `npm run phone`.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.PORT ?? '4000';
const candidates = [
  process.env.ANDROID_HOME && join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
  process.env.ANDROID_SDK_ROOT && join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe'),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  process.env.HOME && join(process.env.HOME, 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
  process.env.HOME && join(process.env.HOME, 'Android', 'Sdk', 'platform-tools', 'adb'),
].filter(Boolean);
const adb = candidates.find((p) => existsSync(p)) ?? 'adb';

const devices = execFileSync(adb, ['devices'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.trim().split(/\s+/))
  .filter(([id, state]) => id && state === 'device')
  .map(([id]) => id);

if (!devices.length) {
  console.error('No Android device/emulator found. Connect the phone by USB with USB debugging on, then retry.');
  process.exit(1);
}
for (const id of devices) {
  execFileSync(adb, ['-s', id, 'reverse', `tcp:${PORT}`, `tcp:${PORT}`]);
  console.log(`✓ ${id}: phone localhost:${PORT} → this PC's API`);
}
