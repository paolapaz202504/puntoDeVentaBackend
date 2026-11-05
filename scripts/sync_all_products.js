const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { CloudStorageService } = require('../dist/services/cloudStorage.service.js');

async function syncToDatabase(dbUrl, envName, mapping) {
  console.log(`\n=== Sincronizando Base de Datos: ${envName} ===`);
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  let updatedCount = 0;
  
  try {
    const prodDir = path.resolve(__dirname, '../files/products');
    for (const [code, imgPath] of Object.entries(mapping)) {
      const localFile = path.join(prodDir, path.basename(imgPath));
      if (fs.existsSync(localFile)) {
        await prisma.product.updateMany({
          where: { code },
          data: { image_url: imgPath }
        });
        updatedCount++;
      }
    }
    console.log(`[${envName}] ${updatedCount} productos actualizados con su imagen correspondiente.`);
  } catch (err) {
    console.error(`Error en BD ${envName}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function uploadToGcsBucket(envPrefix) {
  console.log(`\n=== Subiendo imágenes a GCS para entorno: "${envPrefix}" ===`);
  process.env.NODE_ENV = envPrefix === 'prod' ? 'production' : 'development';
  
  // Re-instanciar CloudStorage para que tome el NODE_ENV correcto
  const cloudStorage = CloudStorageService.getInstance();
  if (!cloudStorage.isAvailable()) {
    console.warn(`CloudStorage no está disponible para ${envPrefix}`);
    return;
  }

  const prodDir = path.resolve(__dirname, '../files/products');
  const files = fs.readdirSync(prodDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  console.log(`Total archivos locales encontrados: ${files.length}`);

  let uploaded = 0;
  for (const f of files) {
    const localPath = path.join(prodDir, f);
    const destination = `files/products/${f}`;
    const res = await cloudStorage.uploadLocalFile(localPath, destination, 'image/png');
    if (res) uploaded++;
  }
  console.log(`[GCS ${envPrefix}] ${uploaded}/${files.length} archivos subidos exitosamente.`);
}

async function run() {
  const mappingPath = path.resolve(__dirname, 'product_image_mapping.json');
  if (!fs.existsSync(mappingPath)) {
    console.error('No se encontró product_image_mapping.json');
    return;
  }
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  // 1. Cargar variables de entorno DEV
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.development') });
  const devDbUrl = process.env.DATABASE_URL;

  // 2. Cargar variables de entorno PROD
  const prodEnv = fs.readFileSync(path.resolve(__dirname, '../.env.production'), 'utf8');
  let prodDbUrl = devDbUrl;
  for (const line of prodEnv.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      prodDbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
    }
  }

  // 3. Subir a GCS DEV y actualizar BD DEV
  await uploadToGcsBucket('dev');
  await syncToDatabase(devDbUrl, 'DESARROLLO (refresqueriadbdev)', mapping);

  // 4. Subir a GCS PROD y actualizar BD PROD
  await uploadToGcsBucket('prod');
  await syncToDatabase(prodDbUrl, 'PRODUCCIÓN (refresqueriadbprod)', mapping);

  console.log('\n🎉 ¡Proceso de sincronización completado en Desarrollo y Producción!');
}

run().catch(console.error);
