const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const dotenv = require('dotenv');

async function mapConcurrent(items, concurrency, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function uploadWebpFiles(storage, bucketName, envPrefix, files, prodDir) {
  console.log(`\n☁️ Subiendo ${files.length} archivos WebP a GCS (prefijo: "${envPrefix}/files/products/")...`);
  const bucket = storage.bucket(bucketName);
  let successCount = 0;

  await mapConcurrent(files, 15, async (file) => {
    const localPath = path.join(prodDir, file);
    const dest = `${envPrefix}/files/products/${file}`;
    try {
      await bucket.upload(localPath, {
        destination: dest,
        contentType: 'image/webp',
        metadata: {
          cacheControl: 'public, max-age=31536000, immutable',
          contentType: 'image/webp',
        },
      });
      successCount++;
      if (successCount % 20 === 0 || successCount === files.length) {
        console.log(`  -> [GCS ${envPrefix}] ${successCount}/${files.length} WebP subidos...`);
      }
    } catch (err) {
      console.error(`  ❌ Error subiendo ${file} a GCS (${dest}):`, err.message);
    }
  });

  console.log(`✅ [GCS ${envPrefix}] Finalizado: ${successCount}/${files.length} WebP subidos.`);
}

async function main() {
  console.log('=================================================================');
  console.log('🚀 SUBIDA DE IMÁGENES WEBP OPTIMIZADAS A GOOGLE CLOUD STORAGE');
  console.log('=================================================================');

  const prodDir = path.resolve(__dirname, '../files/products');
  const files = fs.readdirSync(prodDir).filter(f => f.endsWith('.webp'));
  console.log(`📁 Total archivos WebP locales: ${files.length}`);

  const devEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.development')));
  const prodEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.production')));

  const keyFile = devEnv.GCP_KEY_FILE || prodEnv.GCP_KEY_FILE || './gcp-key.json';
  const resolvedKeyPath = path.resolve(__dirname, '..', keyFile);
  const projectId = devEnv.GCP_PROJECT_ID || prodEnv.GCP_PROJECT_ID;
  const bucketName = devEnv.GCP_STORAGE_BUCKET || prodEnv.GCP_STORAGE_BUCKET || 'punto_de_venta';

  const storage = new Storage({
    projectId: projectId,
    keyFilename: resolvedKeyPath,
  });

  // 1. Subir WebP a GCS dev
  await uploadWebpFiles(storage, bucketName, 'dev', files, prodDir);

  // 2. Subir WebP a GCS prod
  await uploadWebpFiles(storage, bucketName, 'prod', files, prodDir);

  console.log('\n🎉 Subida de 83 imágenes WebP a GCS Dev y Prod completada exitosamente.');
}

main().catch(console.error);
