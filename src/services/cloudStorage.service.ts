import { Storage } from "@google-cloud/storage";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger.js";

export class CloudStorageService {
  private static instance: CloudStorageService | null = null;
  private storage: Storage | null = null;
  private bucketName: string;
  private isConfigured: boolean = false;

  private constructor() {
    this.bucketName = process.env.GCP_STORAGE_BUCKET || "punto_de_venta";
    const keyFile = process.env.GCP_KEY_FILE || "./gcp-key.json";
    
    // Resolución flexible: si se ejecuta desde la raíz del workspace o desde /backend
    let resolvedKeyPath = path.resolve(process.cwd(), keyFile);
    if (!fs.existsSync(resolvedKeyPath)) {
      const backendPath = path.resolve(process.cwd(), "backend", keyFile);
      if (fs.existsSync(backendPath)) {
        resolvedKeyPath = backendPath;
      }
    }

    if (fs.existsSync(resolvedKeyPath)) {
      try {
        this.storage = new Storage({
          projectId: process.env.GCP_PROJECT_ID,
          keyFilename: resolvedKeyPath,
        });
        this.isConfigured = true;
        logger.info(
          `☁️ CloudStorageService inicializado correctamente. Bucket: "${this.bucketName}", Entorno: "${this.getEnvPrefix()}"`
        );
      } catch (err: any) {
        logger.warn(`⚠️ Error al inicializar CloudStorageService: ${err.message}`);
        this.isConfigured = false;
      }
    } else {
      logger.warn(
        `⚠️ Archivo de credenciales GCP no encontrado en ${resolvedKeyPath}. Almacenamiento Cloud deshabilitado.`
      );
      this.isConfigured = false;
    }
  }

  public static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  /**
   * Determina la carpeta raíz dentro del bucket: 'prod' si NODE_ENV === 'production', sino 'dev'
   */
  public getEnvPrefix(): "prod" | "dev" {
    return process.env.NODE_ENV === "production" ? "prod" : "dev";
  }

  /**
   * Resuelve la ruta completa dentro del bucket anteponiendo el entorno (dev/ o prod/)
   */
  public getRemotePath(subPath: string): string {
    const cleanSubPath = subPath.replace(/^\/+/, "").replace(/\\/g, "/");
    return `${this.getEnvPrefix()}/${cleanSubPath}`;
  }

  public isAvailable(): boolean {
    return this.isConfigured && this.storage !== null;
  }

  /**
   * Sube un archivo local al bucket en la ruta relativa especificada
   */
  public async uploadLocalFile(
    localPath: string,
    destinationSubPath: string,
    contentType?: string
  ): Promise<{ remotePath: string; publicUrl: string } | null> {
    if (!this.isAvailable() || !this.storage) {
      logger.warn(`CloudStorage no disponible, se omite subida de ${localPath}`);
      return null;
    }

    try {
      const remotePath = this.getRemotePath(destinationSubPath);
      const bucket = this.storage.bucket(this.bucketName);

      await bucket.upload(localPath, {
        destination: remotePath,
        contentType: contentType,
        metadata: contentType ? { contentType } : undefined,
      });

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${remotePath}`;
      logger.info(`☁️ Archivo subido exitosamente a GCS: ${remotePath}`);
      return { remotePath, publicUrl };
    } catch (error: any) {
      logger.error(`Error al subir archivo a GCS (${destinationSubPath}): ${error.message}`);
      return null;
    }
  }

  /**
   * Sube un Buffer directamente al bucket
   */
  public async uploadBuffer(
    buffer: Buffer,
    destinationSubPath: string,
    contentType: string = "application/octet-stream"
  ): Promise<{ remotePath: string; publicUrl: string } | null> {
    if (!this.isAvailable() || !this.storage) {
      return null;
    }

    try {
      const remotePath = this.getRemotePath(destinationSubPath);
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(remotePath);

      await file.save(buffer, {
        contentType,
        metadata: { contentType },
      });

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${remotePath}`;
      logger.info(`☁️ Buffer subido exitosamente a GCS: ${remotePath}`);
      return { remotePath, publicUrl };
    } catch (error: any) {
      logger.error(`Error al subir buffer a GCS (${destinationSubPath}): ${error.message}`);
      return null;
    }
  }

  /**
   * Descarga un archivo desde el bucket a una ruta local
   */
  public async downloadFile(remoteSubPath: string, localDestinationPath: string): Promise<boolean> {
    if (!this.isAvailable() || !this.storage) {
      return false;
    }

    try {
      const remotePath = this.getRemotePath(remoteSubPath);
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(remotePath);

      const destDir = path.dirname(localDestinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      await file.download({ destination: localDestinationPath });
      logger.info(`☁️ Archivo descargado desde GCS: ${remotePath} -> ${localDestinationPath}`);
      return true;
    } catch (error: any) {
      logger.error(`Error al descargar archivo desde GCS (${remoteSubPath}): ${error.message}`);
      return false;
    }
  }

  /**
   * Lista archivos en una subcarpeta del entorno actual en GCS
   */
  public async listFiles(subFolder: string): Promise<string[]> {
    if (!this.isAvailable() || !this.storage) {
      return [];
    }

    try {
      const prefix = this.getRemotePath(subFolder).replace(/\/?$/, "/");
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({ prefix });
      return files.map((f) => f.name.replace(prefix, "")).filter(Boolean);
    } catch (error: any) {
      logger.error(`Error al listar archivos en GCS (${subFolder}): ${error.message}`);
      return [];
    }
  }

  /**
   * Elimina un archivo del bucket
   */
  public async deleteFile(remoteSubPath: string): Promise<boolean> {
    if (!this.isAvailable() || !this.storage) {
      return false;
    }

    try {
      const remotePath = this.getRemotePath(remoteSubPath);
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(remotePath).delete({ ignoreNotFound: true });
      logger.info(`☁️ Archivo eliminado de GCS: ${remotePath}`);
      return true;
    } catch (error: any) {
      logger.error(`Error al eliminar archivo de GCS (${remoteSubPath}): ${error.message}`);
      return false;
    }
  }
}

export const cloudStorage = CloudStorageService.getInstance();
