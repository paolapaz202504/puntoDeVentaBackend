const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

async function syncProdDb() {
  const prodEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.production')));
  const mappingPath = path.resolve(__dirname, 'product_image_mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  let url = prodEnv.DATABASE_URL;
  if (url.includes('connect_timeout=')) {
    url = url.replace(/connect_timeout=\d+/, 'connect_timeout=60');
  } else {
    url += (url.includes('?') ? '&' : '?') + 'connect_timeout=60';
  }

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  console.log('Iniciando actualización en Producción (refresqueriadbprod)...');

  const entries = Object.entries(mapping);
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Intento de actualización ${attempt}...`);
      const updated = await prisma.$executeRawUnsafe(rawSql);
      console.log(`✅ Filas actualizadas: ${updated}`);

      const countWithImage = await prisma.product.count({
        where: { image_url: { not: null } }
      });
      const total = await prisma.product.count();
      console.log(`✅ Estado Producción: ${countWithImage} de ${total} productos tienen imagen asignada.`);
      break;
    } catch (err) {
      console.error(`Error en intento ${attempt}:`, err.message);
      if (attempt < 3) {
        console.log('Esperando 5s antes de reintentar...');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw err;
      }
    }
  }

  await prisma.$disconnect();
}

syncProdDb().catch(err => {
  console.error('Fallo final en producción:', err);
  process.exit(1);
});
