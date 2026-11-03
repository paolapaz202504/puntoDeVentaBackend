import { prisma } from "../../config/db.js";

export class SettingsService {
  static async getSettings() {
    let settings = await prisma.systemSetting.findFirst();

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          company_name: "Restaurante puntoV",
          currency_symbol: "$",
          created_by: "SYSTEM",
        },
      });
    }

    return settings;
  }

  static async updateSettings(
    data: {
      company_name: string;
      tax_id?: string;
      phone?: string;
      email?: string;
      address?: string;
      currency_symbol?: string;
    },
    updatedBy?: string
  ) {
    const current = await this.getSettings();

    return prisma.systemSetting.update({
      where: { id: current.id },
      data: {
        company_name: data.company_name,
        tax_id: data.tax_id || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        currency_symbol: data.currency_symbol || "$",
        updated_by: updatedBy || null,
      },
    });
  }

  static async updateLogo(logoUrl: string, updatedBy?: string) {
    const current = await this.getSettings();

    return prisma.systemSetting.update({
      where: { id: current.id },
      data: {
        logo_url: logoUrl,
        updated_by: updatedBy || null,
      },
    });
  }
}
