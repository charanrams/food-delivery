// Works around npm's optional-dependency bug (npm/cli#4828): on this Windows setup `npm install`
// sometimes skips the platform binaries for esbuild (used by tsx/tsup/vite) and rolldown (vitest).
// Runs on `postinstall`; installs any missing binary next to the package that needs it.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const platformPkg = {
  esbuild: `@esbuild/${process.platform}-${process.arch}`,
  rolldown: `@rolldown/binding-${process.platform}-${process.arch}${process.platform === 'win32' ? '-msvc' : process.platform === 'linux' ? '-gnu' : ''}`,
};

/** Every installed copy of `name` (top-level and nested), with its version. */
function findCopies(name, dir = join(root, 'node_modules'), out = []) {
  if (!existsSync(dir)) return out;
  const pkg = join(dir, name, 'package.json');
  if (existsSync(pkg)) out.push({ dir: join(dir, name), nodeModules: dir, version: JSON.parse(readFileSync(pkg, 'utf8')).version });
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.bin') continue;
    const scoped = entry.name.startsWith('@') ? readdirSync(join(dir, entry.name)).map((n) => join(entry.name, n)) : [entry.name];
    for (const p of scoped) {
      const nested = join(dir, p, 'node_modules');
      if (existsSync(nested)) findCopies(name, nested, out);
    }
  }
  return out;
}

let fixed = 0;
for (const [name, binary] of Object.entries(platformPkg)) {
  for (const copy of findCopies(name)) {
    const target = join(copy.nodeModules, binary);
    if (existsSync(join(target, 'package.json'))) continue;
    rmSync(target, { recursive: true, force: true }); // clear any empty/partial folder
    // npm can leave a half-renamed '.<name>-XXXX' temp dir behind (e.g. when OneDrive locks files).
    const scope = dirname(target);
    if (existsSync(scope)) for (const d of readdirSync(scope)) if (d.startsWith('.' + binary.split('/')[1] + '-')) rmSync(join(scope, d), { recursive: true, force: true });
    const tmp = join(tmpdir(), `a3-bind-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    try {
      const spec = `${binary}@${copy.version}`;
      const file = execFileSync('npm', ['pack', spec, '--pack-destination', tmp, '--silent'], { cwd: tmp, shell: true, encoding: 'utf8' }).trim().split(/\r?\n/).pop();
      mkdirSync(target, { recursive: true });
      // Windows' own bsdtar understands drive-letter paths (Git Bash's GNU tar does not).
      const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
      execFileSync(tar, ['-xzf', join(tmp, file), '-C', target, '--strip-components=1']);
      console.log(`ensure-native-bindings: installed ${spec} for ${copy.dir.replace(root, '.')}`);
      fixed++;
    } catch (e) {
      console.warn(`ensure-native-bindings: could not install ${binary}@${copy.version} (${e.message.split('\n')[0]})`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}
if (!fixed) console.log('ensure-native-bindings: all native bindings present');
