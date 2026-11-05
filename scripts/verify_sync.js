const fs = require('fs');
const path = require('path');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

function checkHttpUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, statusCode: res.statusCode });
    }).on('error', (err) => {
      resolve({ url, statusCode: 500, error: err.message });
    });
  });
}

function prepareUrl(rawUrl) {
  let url = rawUrl;
  if (url.includes('connect_timeout=')) {
    url = url.replace(/connect_timeout=\d+/, 'connect_timeout=60');
  } else {
    url += (url.includes('?') ? '&' : '?') + 'connect_timeout=60';
  }
  return url;
}

async function verifyAll() {
  console.log('====================================================');
  console.log('🔍 AUDITORÍA DE VERIFICACIÓN: DESARROLLO Y PRODUCCIÓN');
  console.log('====================================================');

  const devEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.development')));
  const prodEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.production')));

  const prismaDev = new PrismaClient({ datasources: { db: { url: prepareUrl(devEnv.DATABASE_URL) } } });
  const prismaProd = new PrismaClient({ datasources: { db: { url: prepareUrl(prodEnv.DATABASE_URL) } } });

  try {
    let devTotal = 0, devWithImg = 0;
    for (let i = 0; i < 3; i++) {
      try {
        devTotal = await prismaDev.product.count();
        devWithImg = await prismaDev.product.count({ where: { image_url: { not: null } } });
        break;
      } catch (e) {
        if (i === 2) throw e;
        await new Promise(r => setTimeout(r, 4000));
      }
    }
    console.log(`[DESARROLLO]  Productos: ${devWithImg}/${devTotal} con imagen.`);

    let prodTotal = 0, prodWithImg = 0;
    for (let i = 0; i < 3; i++) {
      try {
        prodTotal = await prismaProd.product.count();
        prodWithImg = await prismaProd.product.count({ where: { image_url: { not: null } } });
        break;
      } catch (e) {
        if (i === 2) throw e;
        await new Promise(r => setTimeout(r, 4000));
      }
    }
    console.log(`[PRODUCCIÓN]  Productos: ${prodWithImg}/${prodTotal} con imagen.`);

    // Tomar muestra de 5 productos
    const samples = await prismaProd.product.findMany({
      where: {
        code: {
          in: ['BEB-CC-L354', 'PAN-POLLO-MAYO', 'LIC-CHOCO-16', 'REF-HORCHATA', 'TOS-POLLO-MAYO']
        }
      },
      select: { code: true, name: true, image_url: true }
    });

    console.log('\n--- MUESTRA DE PRODUCTOS EN BD ---');
    for (const p of samples) {
      console.log(`- ${p.code} | ${p.name} -> ${p.image_url}`);
    }

    console.log('\n--- VERIFICACIÓN HTTP DE IMÁGENES EN GCS BUCKET ---');
    const testUrls = [
      'https://storage.googleapis.com/punto_de_venta/dev/files/products/coca_cola_lata_354.png',
      'https://storage.googleapis.com/punto_de_venta/dev/files/products/pan_con_pollo_mayonesa.png',
      'https://storage.googleapis.com/punto_de_venta/prod/files/products/coca_cola_lata_354.png',
      'https://storage.googleapis.com/punto_de_venta/prod/files/products/pan_con_pollo_mayonesa.png',
      'https://storage.googleapis.com/punto_de_venta/prod/files/products/licuado_chocomilk_16oz.png',
      'https://storage.googleapis.com/punto_de_venta/prod/files/products/refresco_horchata.png',
      'https://storage.googleapis.com/punto_de_venta/prod/files/products/tostada_pollo_mayonesa.png'
    ];

    for (const u of testUrls) {
      const res = await checkHttpUrl(u);
      console.log(`HTTP ${res.statusCode}: ${res.url}`);
    }

  } finally {
    await prismaDev.$disconnect();
    await prismaProd.$disconnect();
  }
}

verifyAll().catch(console.error);
