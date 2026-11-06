import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  generatedAt: string;
  checksum?: string;
}

export class CacheService {
  private static instance: CacheService | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheDir: string;

  private constructor() {
    this.cacheDir = path.resolve(process.cwd(), "files/cache");
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch (err: any) {
        logger.warn(`No se pudo crear carpeta de caché estático: ${err.message}`);
      }
    }
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Sanitiza la clave para generar nombres de archivo válidos en cualquier SO (Windows/Linux/Docker)
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[/\\?%*:|"<>]/g, "_");
  }

  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${this.sanitizeKey(key)}.json`);
  }

  /**
   * Obtiene datos desde la memoria o desde archivo JSON estático persistido
   */
  public async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. Verificar caché en memoria
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (memoryEntry.expiresAt > now) {
        return memoryEntry.data as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 2. Verificar archivo JSON estático (Estrategia JSON-First)
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        const entry: CacheEntry<T> = JSON.parse(fileContent);
        if (entry.expiresAt > now) {
          // Rehidratar memoria
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Expirado
          await fs.promises.unlink(filePath).catch(() => {});
        }
      } catch (err: any) {
        logger.warn(`Error al leer archivo JSON estático ${key}: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Guarda datos en memoria y persiste atómicamente en archivo JSON estático
   */
  public async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const entry: CacheEntry<T> = {
      data,
      expiresAt,
      generatedAt: new Date().toISOString(),
    };

    // 1. Guardar en memoria
    this.memoryCache.set(key, entry);

    // 2. Guardar atómicamente en disco (archivo temporal + rename)
    const safeKey = this.sanitizeKey(key);
    const tempPath = path.join(this.cacheDir, `${safeKey}.${Date.now()}.tmp`);
    const finalPath = this.getFilePath(key);

    try {
      await fs.promises.writeFile(tempPath, JSON.stringify(entry), "utf-8");
      await fs.promises.rename(tempPath, finalPath);
    } catch (err: any) {
      logger.warn(`Error al persistir JSON estático ${key}: ${err.message}`);
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath).catch(() => {});
      }
    }
  }

  /**
   * Patrón Cache-Aside / GetOrSet: retorna caché o ejecuta fetchFn si no existe
   */
  public async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Invalida una clave de caché específica
   */
  public async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(() => {});
    }
  }

  /**
   * Invalida todas las claves que comiencen con el prefijo indicado
   */
  public async invalidatePattern(prefix: string): Promise<void> {
    // Memoria
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // Archivos
    const safePrefix = this.sanitizeKey(prefix);
    if (fs.existsSync(this.cacheDir)) {
      try {
        const files = await fs.promises.readdir(this.cacheDir);
        for (const f of files) {
          if (f.startsWith(safePrefix) && f.endsWith(".json")) {
            await fs.promises.unlink(path.join(this.cacheDir, f)).catch(() => {});
          }
        }
      } catch (err: any) {
        logger.warn(`Error invalidando patrón ${prefix}: ${err.message}`);
      }
    }
  }

  // Claves y ganchos estándar (cacheBdAgent)
  public async invalidatePosProducts(): Promise<void> {
    await this.invalidatePattern("pos_products");
  }

  public async invalidateDashboard(): Promise<void> {
    await this.invalidatePattern("dashboard_metrics");
  }

  public async invalidateCatalogs(): Promise<void> {
    await this.invalidate("categories_catalog");
    await this.invalidate("tables_catalog");
    await this.invalidate("areas_catalog");
  }
}

export const cache = CacheService.getInstance();
