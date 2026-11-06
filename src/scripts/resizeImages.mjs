import sharp from "sharp";
import { readdirSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

for (const file of walk("assets/images").filter((f) => /\.jpe?g$/i.test(f))) {
  const tmp = file + ".tmp";
  const info = await sharp(file)
    .rotate() // respect the phone's orientation flag
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(tmp);
  renameSync(tmp, file);
  console.log(file, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
}
