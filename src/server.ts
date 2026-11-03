import { app } from "./app.js";
import { ENV } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./config/db.js";

async function bootstrap() {
  try {
    app.listen(ENV.PORT, () => {
      logger.info(`🚀 Servidor backend escuchando en http://localhost:${ENV.PORT}`);
      logger.info(`📋 Diagnóstico disponible en http://localhost:${ENV.PORT}/api/health`);
    });
  } catch (error) {
    logger.error({ error }, "Error fatal al iniciar servidor");
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
