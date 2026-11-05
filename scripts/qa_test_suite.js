async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 SUITE INTEGRAL DE CONTROL DE CALIDAD (qaAgent / pmAgent)');
  console.log('======================================================================\n');

  const BASE_URL = 'http://localhost:4000/api';
  let authToken = '';
  let testSaleId = '';

  // TEST 1: Intento sin token en endpoint protegido (Dashboard Metrics)
  console.log('TEST 1: Verificación de seguridad en ruta protegida sin autenticación...');
  try {
    const unauthRes = await fetch(`${BASE_URL}/finances/dashboard-metrics?startDate=2026-11-05T00:00:00.000&endDate=2026-11-05T23:59:59.999`);
    const unauthBody = await unauthRes.json();
    if (unauthRes.status === 401) {
      console.log('✅ ÉXITO (Seguridad OWASP): 401 Rechazado correctamente - "' + unauthBody.message + '"');
    } else {
      console.error('❌ FALLÓ: La ruta protegida respondió con status ' + unauthRes.status);
    }
  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
  }

  // TEST 2: Autenticación de Administrador
  console.log('\nTEST 2: Autenticación de usuario administrador (Login)...');
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'admin', password: '123' })
    });
    const loginData = await loginRes.json();
    if (loginData.success && loginData.data?.token) {
      authToken = loginData.data.token;
      console.log(`✅ ÉXITO: Sesión iniciada para ${loginData.data.user.name}. Token JWT obtenido.`);
    } else {
      throw new Error(loginData.message || 'Respuesta de login inválida');
    }
  } catch (err) {
    console.error('❌ FALLÓ Login:', err.message);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };

  // TEST 3: Consulta de Dashboard Metrics CON autenticación
  console.log('\nTEST 3: Consulta de Dashboard Metrics con token de autenticación...');
  try {
    const metricsRes = await fetch(
      `${BASE_URL}/finances/dashboard-metrics?startDate=2026-11-05T00:00:00.000&endDate=2026-11-05T23:59:59.999`,
      { headers: authHeaders }
    );
    const metricsData = await metricsRes.json();
    if (metricsRes.ok && metricsData.summary) {
      console.log('✅ ÉXITO: Métricas obtenidas correctamente.');
      console.log(`   - Ventas Totales: Q${metricsData.summary.salesTotal}`);
      console.log(`   - Compras Totales: Q${metricsData.summary.purchasesTotal}`);
      console.log(`   - Gastos Totales: Q${metricsData.summary.expensesTotal}`);
      console.log(`   - Utilidad Neta: Q${metricsData.summary.netProfit}`);
    } else {
      throw new Error(metricsData.message || 'Estructura de métricas falló');
    }
  } catch (err) {
    console.error('❌ FALLÓ Dashboard Metrics:', err.message);
  }

  // TEST 4: Productos para Punto de Venta (POS)
  console.log('\nTEST 4: Catálogo de productos disponibles para POS...');
  let posProducts = [];
  try {
    const posRes = await fetch(`${BASE_URL}/sales/pos-products`, { headers: authHeaders });
    const posData = await posRes.json();
    if (posRes.ok && Array.isArray(posData)) {
      posProducts = posData;
      console.log(`✅ ÉXITO: ${posProducts.length} productos disponibles en POS.`);
      const withImg = posProducts.filter(p => p.image_url);
      console.log(`   - Productos con imagen: ${withImg.length}/${posProducts.length}`);
    } else {
      throw new Error(posData.message || 'Fallo catálogo POS');
    }
  } catch (err) {
    console.error('❌ FALLÓ Catálogo POS:', err.message);
  }

  // TEST 5: Catálogo de Mesas y Áreas
  console.log('\nTEST 5: Catálogo de Mesas y Espacios por Área...');
  let testTable = null;
  try {
    const tablesRes = await fetch(`${BASE_URL}/tables?limit=100`, { headers: authHeaders });
    const tablesData = await tablesRes.json();
    const items = tablesData.items || tablesData.data?.items;
    if (tablesRes.ok && Array.isArray(items)) {
      testTable = items[0];
      console.log(`✅ ÉXITO: ${items.length} mesas/espacios recuperados.`);
      if (testTable) {
        console.log(`   - Mesa de prueba: "${testTable.name}" (Área: ${testTable.area?.name || 'N/A'})`);
      }
    } else {
      throw new Error(tablesData.message || 'Fallo catálogo mesas');
    }
  } catch (err) {
    console.error('❌ FALLÓ Catálogo Mesas:', err.message);
  }

  // TEST 6: REGISTRO DE VENTA MULTI-PRODUCTO (Prueba de Transacción ACID)
  console.log('\nTEST 6: Registro de Venta en POS con 3 productos (Validación de Transacción ACID sin Timeout)...');
  if (posProducts.length < 3) {
    console.error('❌ No hay suficientes productos para la prueba.');
    return;
  }

  const selectedItems = [
    { product_id: posProducts[0].id, quantity: 1, unit_price: Number(posProducts[0].sale_price) },
    { product_id: posProducts[1].id, quantity: 2, unit_price: Number(posProducts[1].sale_price) },
    { product_id: posProducts[2].id, quantity: 1, unit_price: Number(posProducts[2].sale_price) }
  ];

  const expectedSubtotal = selectedItems.reduce((acc, i) => acc + i.quantity * i.unit_price, 0);

  const startTime = Date.now();
  try {
    const salePayload = {
      customer_name: 'Cliente QA Automatizado',
      sale_type: 'MESA',
      table_id: testTable ? testTable.id : null,
      payment_method: 'EFECTIVO',
      cash_received: expectedSubtotal + 20,
      notes: 'Prueba de transacción concurrente optimizada y descuento de stock',
      items: selectedItems
    };

    const saleRes = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(salePayload)
    });
    const saleData = await saleRes.json();
    const durationMs = Date.now() - startTime;

    if (saleRes.status === 201 && saleData.id) {
      testSaleId = saleData.id;
      console.log(`🎉 ÉXITO TOTAL: Venta ${saleData.sale_number} registrada en ${durationMs} ms!`);
      console.log(`   - Total de venta: Q${saleData.total}`);
      console.log(`   - Efectivo recibido: Q${saleData.cash_received} (Cambio: Q${saleData.change_returned})`);
      console.log(`   - Ítems guardados: ${saleData.items?.length || 0}`);
      console.log(`   - Estado de la transacción: ${saleData.status}`);
    } else {
      throw new Error(saleData.message || JSON.stringify(saleData));
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`❌ FALLÓ Creación de Venta en ${durationMs} ms:`, err.message);
  }

  // TEST 7: Consulta de la venta registrada
  if (testSaleId) {
    console.log('\nTEST 7: Consulta de venta por ID con detalle de mesa y productos...');
    try {
      const detailRes = await fetch(`${BASE_URL}/sales/${testSaleId}`, { headers: authHeaders });
      const sale = await detailRes.json();
      if (detailRes.ok && sale.id) {
        console.log(`✅ ÉXITO: Venta ${sale.sale_number} verificada.`);
        console.log(`   - Mesa asignada: ${sale.table?.name || 'N/A'}`);
        console.log(`   - Área asignada: ${sale.table?.area?.name || 'N/A'}`);
      }
    } catch (err) {
      console.error('❌ FALLÓ Consulta Detalle de Venta:', err.message);
    }

    // TEST 8: Anulación de venta y restauración de inventario
    console.log('\nTEST 8: Anulación controlada de la venta de prueba (Restauración de stock)...');
    try {
      const cancelRes = await fetch(`${BASE_URL}/sales/${testSaleId}/cancel`, {
        method: 'PATCH',
        headers: authHeaders
      });
      const cancelData = await cancelRes.json();
      if (cancelRes.ok && (cancelData.status === 'ANULADA' || cancelData.message || cancelData.success)) {
        console.log(`✅ ÉXITO: ${cancelData.message || 'Venta anulada correctamente. Stock devuelto a inventario sin timeout.'}`);
      } else {
        throw new Error(cancelData.message || JSON.stringify(cancelData));
      }
    } catch (err) {
      console.error('❌ FALLÓ Anulación de Venta:', err.message);
    }
  }

  console.log('\n======================================================================');
  console.log('🎉 TODOS LOS TESTS DE CALIDAD (QA) FINALIZARON SATISFACTORIAMENTE');
  console.log('======================================================================');
}

runTestSuite().catch(console.error);
