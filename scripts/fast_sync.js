const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Helper para limitar concurrencia
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

async function uploadToGcs(storage, bucketName, envPrefix, files, prodDir) {
  console.log(`\n☁️ Subiendo ${files.length} archivos a GCS (prefijo: "${envPrefix}/files/products/")...`);
  const bucket = storage.bucket(bucketName);
  let successCount = 0;

  await mapConcurrent(files, 10, async (file) => {
    const localPath = path.join(prodDir, file);
    const dest = `${envPrefix}/files/products/${file}`;
    try {
      await bucket.upload(localPath, {
        destination: dest,
        contentType: 'image/png',
        metadata: {
          cacheControl: 'public, max-age=86400',
          contentType: 'image/png',
        },
      });
      successCount++;
      if (successCount % 20 === 0 || successCount === files.length) {
        console.log(`  -> [GCS ${envPrefix}] ${successCount}/${files.length} subidos...`);
      }
    } catch (err) {
      console.error(`  ❌ Error subiendo ${file} a GCS (${dest}):`, err.message);
    }
  });

  console.log(`✅ [GCS ${envPrefix}] Finalizado: ${successCount}/${files.length} subidos con éxito.`);
}

async function updateDatabaseFast(dbUrl, envName, mapping) {
  console.log(`\n🗄️ Actualizando Base de Datos: ${envName}...`);
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  
  try {
    const entries = Object.entries(mapping);
    if (entries.length === 0) {
      console.log('No hay productos para mapear.');
      return;
    }

    // Construir query SQL CASE WHEN para actualizar todos en 1 sola consulta
    const cases = entries
      .map(([code, img]) => `WHEN '${code.replace(/'/g, "''")}' THEN '${img.replace(/'/g, "''")}'`)
      .join(' ');
    const codesList = entries
      .map(([code]) => `'${code.replace(/'/g, "''")}'`)
      .join(', ');

    const rawSql = `
      UPDATE products 
      SET image_url = CASE code ${cases} ELSE image_url END
      WHERE code IN (${codesList});
    `;

    const updated = await prisma.$executeRawUnsafe(rawSql);
    console.log(`  -> Registros afectados/actualizados por SQL: ${updated}`);

    // Verificar conteo total de productos con image_url
    const totalWithImage = await prisma.product.count({
      where: {
        image_url: {
          not: null
        }
      }
    });
    const totalProducts = await prisma.product.count();
    console.log(`✅ [${envName}] Productos con imagen: ${totalWithImage} de ${totalProducts} totales.`);

  } catch (err) {
    console.error(`❌ Error actualizando BD ${envName}:`, err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('=================================================================');
  console.log('🚀 INICIANDO SINCRONIZACIÓN RÁPIDA DE IMÁGENES (GCS & BASE DE DATOS)');
  console.log('=================================================================');

  const prodDir = path.resolve(__dirname, '../files/products');
  const files = fs.readdirSync(prodDir).filter(f => f.endsWith('.png'));
  console.log(`📁 Total archivos de imagen encontrados en local: ${files.length}`);

  const mappingPath = path.resolve(__dirname, 'product_image_mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  console.log(`📋 Total mapeos de producto: ${Object.keys(mapping).length}`);

  // Cargar variables DEV
  const devEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.development')));
  // Cargar variables PROD
  const prodEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.production')));

  const keyFile = devEnv.GCP_KEY_FILE || prodEnv.GCP_KEY_FILE || './gcp-key.json';
  const resolvedKeyPath = path.resolve(__dirname, '..', keyFile);
  const projectId = devEnv.GCP_PROJECT_ID || prodEnv.GCP_PROJECT_ID;
  const bucketName = devEnv.GCP_STORAGE_BUCKET || prodEnv.GCP_STORAGE_BUCKET || 'punto_de_venta';

  const storage = new Storage({
    projectId: projectId,
    keyFilename: resolvedKeyPath,
  });

  // 1. Subir a GCS en dev y prod (concurrente)
  await uploadToGcs(storage, bucketName, 'dev', files, prodDir);
  await uploadToGcs(storage, bucketName, 'prod', files, prodDir);

  // 2. Actualizar Base de Datos DEV y PROD
  await updateDatabaseFast(devEnv.DATABASE_URL, 'DESARROLLO (refresqueriadbdev)', mapping);
  await updateDatabaseFast(prodEnv.DATABASE_URL, 'PRODUCCIÓN (refresqueriadbprod)', mapping);

  console.log('\n=================================================================');
  console.log('🎉 SINCRONIZACIÓN COMPLETADA CON ÉXITO EN AMBOS ENTORNOS');
  console.log('=================================================================');
}

main().catch(err => {
  console.error('Fallo en sincronización:', err);
  process.exit(1);
});
