import { readFile, writeFile } from 'node:fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import { loadEnv } from '../config/env';
import { PHOTO_SOURCES } from '@a3/contracts';

// `npm run photos -w backend` — downloads the licensed photos (1280px thumbnails, identified
// User-Agent per Wikimedia policy), uploads them to Cloudinary and writes src/scripts/photos.json, which the seed uses for product/category images.
const env = loadEnv();
if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
  throw new Error('Set CLOUDINARY_* in .env first.');
}
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const OUT = new URL('./photos.json', import.meta.url);
const result: Record<string, string> = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
const thumb = (url: string) => {
  const m = /commons\/(.)\/(..)\/([^/]+)$/.exec(url);
  return m ? url.replace(`commons/${m[1]}/${m[2]}/${m[3]}`, `commons/thumb/${m[1]}/${m[2]}/${m[3]}/1280px-${m[3]}`) : url;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'A3KitchenSetup/0.1 (food delivery dev seed)' } });
    if (res.ok) return res;
    if (res.status !== 429 || attempt === 6) throw new Error(`download failed ${res.status}: ${url}`);
    await sleep(attempt * 10_000); // polite back-off on rate limits
  }
}

for (const p of PHOTO_SOURCES) {
  if (result[p.key]) continue; // already uploaded — re-run safely
  const res = await download(thumb(p.source));
  const dataUri = `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  const up = await cloudinary.uploader.upload(dataUri, {
    folder: 'a3-kitchen/products',
    public_id: p.key,
    overwrite: true,
    resource_type: 'image',
    context: { caption: `${p.license} · ${p.author}`, source: p.page },
  });
  result[p.key] = up.secure_url;
  console.log(`✓ ${p.key} → ${up.secure_url} (${up.width}×${up.height})`);
  await writeFile(OUT, JSON.stringify(result, null, 2) + '\n'); // save progress after each photo
  await sleep(3000);
}
console.log(`Saved ${Object.keys(result).length} photo URLs to src/scripts/photos.json`);
