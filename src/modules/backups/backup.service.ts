import fs from "fs";
import path from "path";
import { prisma } from "../../config/db.js";
import { cloudStorage } from "../../services/cloudStorage.service.js";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export class BackupService {
  private static backupDir = path.resolve(process.cwd(), "copia_de_seguridad");
  private static importDir = path.resolve(process.cwd(), "importar_base_de_datos");

  static ensureDirectories() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    if (!fs.existsSync(this.importDir)) {
      fs.mkdirSync(this.importDir, { recursive: true });
    }
  }

  /**
   * Genera un volcado SQL estructurado de la base de datos
   */
  static async generateDumpSQL(): Promise<string> {
    const timestamp = new Date().toISOString();
    let sql = `-- ========================================================\n`;
    sql += `-- Respaldo de Base de Datos - Sistema puntoV POS\n`;
    sql += `-- Generado: ${timestamp}\n`;
    sql += `-- ========================================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // 1. Roles
    const roles = await prisma.role.findMany();
    if (roles.length > 0) {
      sql += `-- Datos de Tabla: roles\n`;
      sql += `DELETE FROM \`roles\`;\n`;
      for (const r of roles) {
        const cBy = r.created_by ? `'${r.created_by}'` : "NULL";
        const uBy = r.updated_by ? `'${r.updated_by}'` : "NULL";
        sql += `INSERT INTO \`roles\` (\`id\`, \`name\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${r.id}', '${r.name.replace(/'/g, "\\'")}', '${r.created_at.toISOString()}', '${r.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 2. Permissions
    const permissions = await prisma.permission.findMany();
    if (permissions.length > 0) {
      sql += `-- Datos de Tabla: permissions\n`;
      sql += `DELETE FROM \`permissions\`;\n`;
      for (const p of permissions) {
        const desc = p.description ? `'${p.description.replace(/'/g, "\\'")}'` : "NULL";
        const cBy = p.created_by ? `'${p.created_by}'` : "NULL";
        const uBy = p.updated_by ? `'${p.updated_by}'` : "NULL";
        sql += `INSERT INTO \`permissions\` (\`id\`, \`slug\`, \`name\`, \`module\`, \`description\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${p.id}', '${p.slug}', '${p.name.replace(/'/g, "\\'")}', '${p.module.replace(/'/g, "\\'")}', ${desc}, '${p.created_at.toISOString()}', '${p.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 3. Role Permissions
    const rolePermissions = await prisma.rolePermission.findMany();
    if (rolePermissions.length > 0) {
      sql += `-- Datos de Tabla: role_permissions\n`;
      sql += `DELETE FROM \`role_permissions\`;\n`;
      for (const rp of rolePermissions) {
        const cBy = rp.created_by ? `'${rp.created_by}'` : "NULL";
        const uBy = rp.updated_by ? `'${rp.updated_by}'` : "NULL";
        sql += `INSERT INTO \`role_permissions\` (\`id\`, \`role_id\`, \`permission_id\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${rp.id}', '${rp.role_id}', '${rp.permission_id}', '${rp.created_at.toISOString()}', '${rp.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 4. Users
    const users = await prisma.user.findMany();
    if (users.length > 0) {
      sql += `-- Datos de Tabla: users\n`;
      sql += `DELETE FROM \`users\`;\n`;
      for (const u of users) {
        const email = u.email ? `'${u.email.replace(/'/g, "\\'")}'` : "NULL";
        const pin = u.pin_code ? `'${u.pin_code}'` : "NULL";
        const cBy = u.created_by ? `'${u.created_by}'` : "NULL";
        const uBy = u.updated_by ? `'${u.updated_by}'` : "NULL";
        const active = u.is_active ? 1 : 0;
        sql += `INSERT INTO \`users\` (\`id\`, \`name\`, \`user\`, \`email\`, \`password_hash\`, \`pin_code\`, \`is_active\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.user.replace(/'/g, "\\'")}', ${email}, '${u.password_hash}', ${pin}, ${active}, '${u.created_at.toISOString()}', '${u.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 5. User Roles
    const userRoles = await prisma.userRole.findMany();
    if (userRoles.length > 0) {
      sql += `-- Datos de Tabla: user_roles\n`;
      sql += `DELETE FROM \`user_roles\`;\n`;
      for (const ur of userRoles) {
        const cBy = ur.created_by ? `'${ur.created_by}'` : "NULL";
        const uBy = ur.updated_by ? `'${ur.updated_by}'` : "NULL";
        sql += `INSERT INTO \`user_roles\` (\`id\`, \`user_id\`, \`role_id\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${ur.id}', '${ur.user_id}', '${ur.role_id}', '${ur.created_at.toISOString()}', '${ur.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 6. System Settings
    const settings = await prisma.systemSetting.findMany();
    if (settings.length > 0) {
      sql += `-- Datos de Tabla: system_settings\n`;
      sql += `DELETE FROM \`system_settings\`;\n`;
      for (const s of settings) {
        const taxId = s.tax_id ? `'${s.tax_id.replace(/'/g, "\\'")}'` : "NULL";
        const phone = s.phone ? `'${s.phone.replace(/'/g, "\\'")}'` : "NULL";
        const email = s.email ? `'${s.email.replace(/'/g, "\\'")}'` : "NULL";
        const addr = s.address ? `'${s.address.replace(/'/g, "\\'")}'` : "NULL";
        const logo = s.logo_url ? `'${s.logo_url.replace(/'/g, "\\'")}'` : "NULL";
        const cBy = s.created_by ? `'${s.created_by}'` : "NULL";
        const uBy = s.updated_by ? `'${s.updated_by}'` : "NULL";
        sql += `INSERT INTO \`system_settings\` (\`id\`, \`company_name\`, \`tax_id\`, \`phone\`, \`email\`, \`address\`, \`currency_symbol\`, \`logo_url\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${s.id}', '${s.company_name.replace(/'/g, "\\'")}', ${taxId}, ${phone}, ${email}, ${addr}, '${s.currency_symbol}', ${logo}, '${s.created_at.toISOString()}', '${s.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 7. Áreas
    const areas = await prisma.area.findMany();
    if (areas.length > 0) {
      sql += `-- Datos de Tabla: areas\n`;
      sql += `DELETE FROM \`areas\`;\n`;
      for (const a of areas) {
        const cBy = a.created_by ? `'${a.created_by}'` : "NULL";
        const uBy = a.updated_by ? `'${a.updated_by}'` : "NULL";
        sql += `INSERT INTO \`areas\` (\`id\`, \`name\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${a.id}', '${a.name.replace(/'/g, "\\'")}', '${a.created_at.toISOString()}', '${a.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 8. Mesas y Espacios
    const tables = await prisma.restaurantTable.findMany();
    if (tables.length > 0) {
      sql += `-- Datos de Tabla: restaurant_tables\n`;
      sql += `DELETE FROM \`restaurant_tables\`;\n`;
      for (const t of tables) {
        const cBy = t.created_by ? `'${t.created_by}'` : "NULL";
        const uBy = t.updated_by ? `'${t.updated_by}'` : "NULL";
        sql += `INSERT INTO \`restaurant_tables\` (\`id\`, \`name\`, \`area_id\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${t.id}', '${t.name.replace(/'/g, "\\'")}', '${t.area_id}', '${t.created_at.toISOString()}', '${t.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 9. Unidades de Medida
    const units = await prisma.measurementUnit.findMany();
    if (units.length > 0) {
      sql += `-- Datos de Tabla: measurement_units\n`;
      sql += `DELETE FROM \`measurement_units\`;\n`;
      for (const u of units) {
        const cBy = u.created_by ? `'${u.created_by}'` : "NULL";
        const uBy = u.updated_by ? `'${u.updated_by}'` : "NULL";
        sql += `INSERT INTO \`measurement_units\` (\`id\`, \`name\`, \`symbol\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.symbol.replace(/'/g, "\\'")}', '${u.created_at.toISOString()}', '${u.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 10. Categorías
    const categories = await prisma.category.findMany();
    if (categories.length > 0) {
      sql += `-- Datos de Tabla: categories\n`;
      sql += `DELETE FROM \`categories\`;\n`;
      for (const c of categories) {
        const desc = c.description ? `'${c.description.replace(/'/g, "\\'")}'` : "NULL";
        const cBy = c.created_by ? `'${c.created_by}'` : "NULL";
        const uBy = c.updated_by ? `'${c.updated_by}'` : "NULL";
        sql += `INSERT INTO \`categories\` (\`id\`, \`name\`, \`description\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${c.id}', '${c.name.replace(/'/g, "\\'")}', ${desc}, '${c.created_at.toISOString()}', '${c.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 11. Marcas / Fabricantes
    const brands = await prisma.brand.findMany();
    if (brands.length > 0) {
      sql += `-- Datos de Tabla: brands\n`;
      sql += `DELETE FROM \`brands\`;\n`;
      for (const b of brands) {
        const desc = b.description ? `'${b.description.replace(/'/g, "\\'")}'` : "NULL";
        const cBy = b.created_by ? `'${b.created_by}'` : "NULL";
        const uBy = b.updated_by ? `'${b.updated_by}'` : "NULL";
        sql += `INSERT INTO \`brands\` (\`id\`, \`name\`, \`description\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${b.id}', '${b.name.replace(/'/g, "\\'")}', ${desc}, '${b.created_at.toISOString()}', '${b.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 12. Productos
    const products = await prisma.product.findMany();
    if (products.length > 0) {
      sql += `-- Datos de Tabla: products\n`;
      sql += `DELETE FROM \`products\`;\n`;
      for (const p of products) {
        const brandIdVal = p.brand_id ? `'${p.brand_id}'` : "NULL";
        const img = p.image_url ? `'${p.image_url.replace(/'/g, "\\'")}'` : "NULL";
        const cBy = p.created_by ? `'${p.created_by}'` : "NULL";
        const uBy = p.updated_by ? `'${p.updated_by}'` : "NULL";
        const active = p.is_active ? 1 : 0;
        sql += `INSERT INTO \`products\` (\`id\`, \`code\`, \`name\`, \`brand_id\`, \`category_id\`, \`base_unit_id\`, \`product_type\`, \`sale_price\`, \`current_cost\`, \`current_stock\`, \`min_stock_alert\`, \`image_url\`, \`is_active\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${p.id}', '${p.code.replace(/'/g, "\\'")}', '${p.name.replace(/'/g, "\\'")}', ${brandIdVal}, '${p.category_id}', '${p.base_unit_id}', '${p.product_type}', ${p.sale_price}, ${p.current_cost}, ${p.current_stock}, ${p.min_stock_alert}, ${img}, ${active}, '${p.created_at.toISOString()}', '${p.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    // 13. Presentaciones de Compra
    const presentations = await prisma.productPurchasePresentation.findMany();
    if (presentations.length > 0) {
      sql += `-- Datos de Tabla: product_purchase_presentations\n`;
      sql += `DELETE FROM \`product_purchase_presentations\`;\n`;
      for (const pr of presentations) {
        const bc = pr.barcode ? `'${pr.barcode.replace(/'/g, "\\'")}'` : "NULL";
        const cost = pr.default_cost ? pr.default_cost : "NULL";
        const cBy = pr.created_by ? `'${pr.created_by}'` : "NULL";
        const uBy = pr.updated_by ? `'${pr.updated_by}'` : "NULL";
        sql += `INSERT INTO \`product_purchase_presentations\` (\`id\`, \`product_id\`, \`name\`, \`conversion_factor\`, \`barcode\`, \`default_cost\`, \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`) VALUES ('${pr.id}', '${pr.product_id}', '${pr.name.replace(/'/g, "\\'")}', ${pr.conversion_factor}, ${bc}, ${cost}, '${pr.created_at.toISOString()}', '${pr.updated_at.toISOString()}', ${cBy}, ${uBy});\n`;
      }
      sql += `\n`;
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    return sql;
  }

  /**
   * Generar Copia de Seguridad y registrar en bitácora
   */
  static async createBackup(
    user: { id: string; name: string; user: string },
    customDestination?: string,
    prefix: string = "backup_puntov"
  ) {
    this.ensureDirectories();

    const dateStr = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .split(".")[0];
    const filename = `${prefix}_${dateStr}.sql`;
    const targetFilePath = path.join(this.backupDir, filename);

    // 1. Generar contenido SQL
    const sqlContent = await this.generateDumpSQL();
    fs.writeFileSync(targetFilePath, sqlContent, "utf8");

    const stats = fs.statSync(targetFilePath);
    const sizeBytes = stats.size;
    const formattedSize = formatBytes(sizeBytes);

    // 2. Si el usuario definió una ruta o carpeta personalizada, copiar el archivo allí
    let customPathSaved: string | null = null;
    if (customDestination && customDestination.trim() !== "") {
      try {
        const rawDest = customDestination.trim();
        let targetCustomFile: string;
        let destFolder: string;

        // Si la ruta termina con .sql, el usuario especificó la carpeta y el nombre del archivo
        if (path.extname(rawDest).toLowerCase() === ".sql") {
          targetCustomFile = path.resolve(rawDest);
          destFolder = path.dirname(targetCustomFile);
        } else {
          // Si solo especificó la carpeta, se concatena el nombre generado automáticamente
          destFolder = path.resolve(rawDest);
          targetCustomFile = path.join(destFolder, filename);
        }

        if (!fs.existsSync(destFolder)) {
          fs.mkdirSync(destFolder, { recursive: true });
        }

        fs.copyFileSync(targetFilePath, targetCustomFile);
        customPathSaved = targetCustomFile;
      } catch (err: any) {
        console.error("Error al copiar respaldo a la ruta personalizada:", err);
        throw new Error(
          `No fue posible guardar la copia en la ruta personalizada especificada: ${err.message}`
        );
      }
    }

    // 3. Sincronizar respaldo con Google Cloud Storage (dev/ o prod/ según entorno)
    if (cloudStorage.isAvailable()) {
      await cloudStorage.uploadLocalFile(
        targetFilePath,
        `copia_de_seguridad/${filename}`,
        "application/sql"
      );
    }

    // 4. Registrar en bitácora de base de datos
    const log = await prisma.backupLog.create({
      data: {
        filename,
        file_path: targetFilePath,
        file_size_bytes: sizeBytes,
        file_size_formatted: formattedSize,
        custom_destination: customPathSaved,
        user_name: user.name,
        user_login: user.user,
        created_by: user.id,
        updated_by: user.id,
      },
    });

    return {
      filename,
      fileSize: formattedSize,
      fileSizeBytes: sizeBytes,
      backupDir: targetFilePath,
      customDestination: customPathSaved,
      log,
    };
  }

  /**
   * Consultar historial de bitácora de respaldos con filtros
   */
  static async listBackupLogs(params: {
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) {
    const { page, limit, startDate, endDate, userId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.created_by = userId;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      prisma.backupLog.count({ where }),
      prisma.backupLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  /**
   * Restaurar base de datos a partir de archivo importado
   */
  static async restoreBackup(
    file: Express.Multer.File,
    user: { id: string; name: string; user: string }
  ) {
    this.ensureDirectories();

    const importedFilename = file.filename;
    const importedFilePath = file.path;
    const fileStats = fs.statSync(importedFilePath);
    const formattedSize = formatBytes(fileStats.size);

    // 1. PASO PREVIO OBLIGATORIO: Generar copia automática de resguardo antes de sobreescribir
    const autoBackup = await this.createBackup(
      user,
      undefined,
      "auto_backup_before_restore"
    );

    // Sincronizar archivo importado con Google Cloud Storage
    if (cloudStorage.isAvailable()) {
      await cloudStorage.uploadLocalFile(
        importedFilePath,
        `importar_base_de_datos/${importedFilename}`,
        "application/sql"
      );
    }

    // 2. Leer archivo SQL importado
    const rawSql = fs.readFileSync(importedFilePath, "utf8");

    // Dividir en sentencias individuales respetando delimitadores
    const statements = rawSql
      .split(";\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    try {
      // 3. Ejecutar sentencias en base de datos
      await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");

      for (const statement of statements) {
        if (statement.trim()) {
          await prisma.$executeRawUnsafe(statement);
        }
      }

      await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");

      // 4. Registrar en bitácora de restauraciones
      const restoreLog = await prisma.restoreLog.create({
        data: {
          imported_filename: importedFilename,
          file_size_bytes: fileStats.size,
          file_size_formatted: formattedSize,
          auto_backup_filename: autoBackup.filename,
          status: "SUCCESS",
          user_name: user.name,
          user_login: user.user,
          created_by: user.id,
          updated_by: user.id,
        },
      });

      return {
        success: true,
        message: "Base de datos restaurada exitosamente",
        autoBackupFilename: autoBackup.filename,
        restoreLog,
      };
    } catch (error: any) {
      await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");

      // Registrar falla en bitácora
      await prisma.restoreLog.create({
        data: {
          imported_filename: importedFilename,
          file_size_bytes: fileStats.size,
          file_size_formatted: formattedSize,
          auto_backup_filename: autoBackup.filename,
          status: "FAILED",
          error_message: error.message || "Error al ejecutar sentencias SQL",
          user_name: user.name,
          user_login: user.user,
          created_by: user.id,
          updated_by: user.id,
        },
      });

      throw new Error(`Fallo en la restauración: ${error.message}`);
    }
  }

  /**
   * Consultar historial de bitácora de restauraciones con filtros
   */
  static async listRestoreLogs(params: {
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) {
    const { page, limit, startDate, endDate, userId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.created_by = userId;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      prisma.restoreLog.count({ where }),
      prisma.restoreLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  static getBackupFilePath(filename: string): string {
    const safePath = path.resolve(this.backupDir, path.basename(filename));
    if (!fs.existsSync(safePath)) {
      throw new Error("El archivo de respaldo solicitado no existe");
    }
    return safePath;
  }
}
