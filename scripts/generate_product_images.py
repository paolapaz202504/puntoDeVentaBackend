import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "files", "products")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Lista completa de productos a generar
PRODUCTS = [
    # Coca-Cola
    {
        "filename": "coca_cola_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Coca-Cola",
        "sub": "Sabor Original",
        "vol": "355 ml",
        "body_color": (35, 20, 15),
        "label_color": (227, 24, 55),
        "text_color": (255, 255, 255),
        "cap_color": (220, 20, 40)
    },
    {
        "filename": "coca_cola_vidrio_600.png",
        "type": "glass_bottle_tall",
        "brand": "Coca-Cola",
        "sub": "Retornable",
        "vol": "600 ml",
        "body_color": (35, 20, 15),
        "label_color": (227, 24, 55),
        "text_color": (255, 255, 255),
        "cap_color": (220, 20, 40)
    },
    {
        "filename": "coca_cola_lata_354.png",
        "type": "can",
        "brand": "Coca-Cola",
        "sub": "Original",
        "vol": "354 ml",
        "body_color": (227, 24, 55),
        "label_color": (200, 16, 46),
        "text_color": (255, 255, 255),
        "cap_color": (210, 215, 220)
    },
    {
        "filename": "coca_cola_zero_lata_354.png",
        "type": "can",
        "brand": "Coca-Cola",
        "sub": "ZERO AZÚCAR",
        "vol": "354 ml",
        "body_color": (20, 20, 20),
        "label_color": (227, 24, 55),
        "text_color": (255, 255, 255),
        "cap_color": (20, 20, 20)
    },
    {
        "filename": "sprite_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Sprite",
        "sub": "Lima-Limón",
        "vol": "355 ml",
        "body_color": (0, 140, 68),
        "label_color": (0, 140, 68),
        "text_color": (255, 255, 255),
        "cap_color": (0, 120, 60)
    },
    {
        "filename": "fanta_naranja_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Fanta",
        "sub": "Naranja",
        "vol": "355 ml",
        "body_color": (245, 130, 32),
        "label_color": (245, 130, 32),
        "text_color": (255, 255, 255),
        "cap_color": (0, 75, 160)
    },
    {
        "filename": "fanta_roja_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Fanta",
        "sub": "Fresa / Roja",
        "vol": "355 ml",
        "body_color": (195, 20, 45),
        "label_color": (195, 20, 45),
        "text_color": (255, 255, 255),
        "cap_color": (180, 15, 40)
    },
    {
        "filename": "mineral_cantinero_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Cantinero",
        "sub": "Agua Mineral",
        "vol": "355 ml",
        "body_color": (175, 215, 235),
        "label_color": (0, 75, 145),
        "text_color": (255, 255, 255),
        "cap_color": (180, 180, 190)
    },

    # PepsiCo / CBC
    {
        "filename": "pepsi_450_vidrio.png",
        "type": "glass_bottle_tall",
        "brand": "Pepsi",
        "sub": "Medio Litro",
        "vol": "450 ml",
        "body_color": (35, 20, 15),
        "label_color": (0, 75, 155),
        "text_color": (255, 255, 255),
        "cap_color": (0, 75, 155)
    },
    {
        "filename": "pepsi_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Pepsi",
        "sub": "Clásica",
        "vol": "355 ml",
        "body_color": (35, 20, 15),
        "label_color": (0, 75, 155),
        "text_color": (255, 255, 255),
        "cap_color": (0, 75, 155)
    },
    {
        "filename": "pepsi_lata_354.png",
        "type": "can",
        "brand": "Pepsi",
        "sub": "Original",
        "vol": "354 ml",
        "body_color": (0, 75, 155),
        "label_color": (227, 24, 55),
        "text_color": (255, 255, 255),
        "cap_color": (210, 215, 220)
    },
    {
        "filename": "grapette_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Grapette",
        "sub": "Uva Tradicional",
        "vol": "355 ml",
        "body_color": (95, 35, 115),
        "label_color": (110, 40, 130),
        "text_color": (255, 255, 255),
        "cap_color": (100, 30, 120)
    },
    {
        "filename": "mineral_salutaris_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Salutaris",
        "sub": "Agua Mineral",
        "vol": "355 ml",
        "body_color": (160, 220, 230),
        "label_color": (0, 110, 140),
        "text_color": (255, 255, 255),
        "cap_color": (0, 110, 140)
    },
    {
        "filename": "tiky_vidrio_355.png",
        "type": "glass_bottle",
        "brand": "Tiky",
        "sub": "Sabor Piña",
        "vol": "355 ml",
        "body_color": (245, 195, 35),
        "label_color": (235, 175, 20),
        "text_color": (120, 20, 20),
        "cap_color": (230, 160, 10)
    },

    # Aguas Puras
    {
        "filename": "salvavidas_bolsa_250.png",
        "type": "pouch",
        "brand": "Salvavidas",
        "sub": "Agua en Bolsa",
        "vol": "250 ml",
        "body_color": (200, 235, 248),
        "label_color": (0, 135, 195),
        "text_color": (255, 255, 255),
        "cap_color": (0, 135, 195)
    },
    {
        "filename": "salvavidas_botella_375.png",
        "type": "pet_bottle",
        "brand": "Salvavidas",
        "sub": "Agua Pura",
        "vol": "375 ml",
        "body_color": (220, 242, 252),
        "label_color": (0, 135, 195),
        "text_color": (255, 255, 255),
        "cap_color": (0, 135, 195)
    },
    {
        "filename": "salvavidas_botella_600.png",
        "type": "pet_bottle_tall",
        "brand": "Salvavidas",
        "sub": "Agua Pura",
        "vol": "600 ml",
        "body_color": (220, 242, 252),
        "label_color": (0, 135, 195),
        "text_color": (255, 255, 255),
        "cap_color": (0, 135, 195)
    },
    {
        "filename": "agua_cielo_botella_350.png",
        "type": "pet_bottle",
        "brand": "Cielo",
        "sub": "Agua Purificada",
        "vol": "350 ml",
        "body_color": (220, 240, 255),
        "label_color": (15, 80, 170),
        "text_color": (255, 255, 255),
        "cap_color": (15, 80, 170)
    },

    # Jugos en Lata
    {
        "filename": "jugo_kerns_melocoton_330.png",
        "type": "can",
        "brand": "Kern's",
        "sub": "Melocotón",
        "vol": "330 ml",
        "body_color": (245, 160, 45),
        "label_color": (0, 105, 55),
        "text_color": (255, 255, 255),
        "cap_color": (210, 215, 220)
    },
    {
        "filename": "jugo_kerns_manzana_330.png",
        "type": "can",
        "brand": "Kern's",
        "sub": "Manzana",
        "vol": "330 ml",
        "body_color": (195, 30, 40),
        "label_color": (0, 105, 55),
        "text_color": (255, 255, 255),
        "cap_color": (210, 215, 220)
    },
    {
        "filename": "jugo_kerns_pera_330.png",
        "type": "can",
        "brand": "Kern's",
        "sub": "Pera",
        "vol": "330 ml",
        "body_color": (175, 190, 40),
        "label_color": (0, 105, 55),
        "text_color": (255, 255, 255),
        "cap_color": (210, 215, 220)
    },
    {
        "filename": "jugo_v8_lata_340.png",
        "type": "can",
        "brand": "V8",
        "sub": "Vegetales 100%",
        "vol": "340 ml",
        "body_color": (185, 25, 25),
        "label_color": (255, 255, 255),
        "text_color": (185, 25, 25),
        "cap_color": (210, 215, 220)
    },

    # Tampico
    {
        "filename": "tampico_botellita_250.png",
        "type": "pet_bottle_small",
        "brand": "Tampico",
        "sub": "Citrus Punch",
        "vol": "250 ml",
        "body_color": (255, 140, 10),
        "label_color": (0, 60, 140),
        "text_color": (255, 255, 255),
        "cap_color": (0, 60, 140)
    },
    {
        "filename": "tampico_pachon_350.png",
        "type": "sport_pachon",
        "brand": "Tampico",
        "sub": "Pachón Citrus",
        "vol": "350 ml",
        "body_color": (255, 140, 10),
        "label_color": (0, 60, 140),
        "text_color": (255, 255, 255),
        "cap_color": (230, 30, 30)
    },

    # Isotónicas
    {
        "filename": "gatorade_mora_azul_600.png",
        "type": "sport_bottle",
        "brand": "Gatorade",
        "sub": "Cool Blue",
        "vol": "600 ml",
        "body_color": (0, 130, 210),
        "label_color": (245, 90, 20),
        "text_color": (255, 255, 255),
        "cap_color": (245, 90, 20)
    },
    {
        "filename": "gatorade_frutas_600.png",
        "type": "sport_bottle",
        "brand": "Gatorade",
        "sub": "Fruit Punch",
        "vol": "600 ml",
        "body_color": (215, 30, 45),
        "label_color": (245, 90, 20),
        "text_color": (255, 255, 255),
        "cap_color": (245, 90, 20)
    },
    {
        "filename": "powerade_mora_600.png",
        "type": "sport_bottle",
        "brand": "Powerade",
        "sub": "Mountain Blast",
        "vol": "600 ml",
        "body_color": (0, 95, 185),
        "label_color": (20, 20, 20),
        "text_color": (255, 255, 255),
        "cap_color": (0, 95, 185)
    }
]

def create_packshot(item):
    size = (500, 500)
    img = Image.new("RGBA", size, (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)

    # 1. Sombra suave en la base
    shadow_box = (140, 435, 360, 460)
    draw.ellipse(shadow_box, fill=(230, 235, 240, 255))
    shadow_core = (170, 440, 330, 455)
    draw.ellipse(shadow_core, fill=(205, 212, 220, 255))

    p_type = item["type"]
    bc = item["body_color"]
    lc = item["label_color"]
    tc = item["text_color"]
    cc = item["cap_color"]

    if "can" in p_type:
        # LATA DE ALUMINIO (354 ml / 330 ml)
        # Borde superior e inferior de aluminio
        draw.rounded_rectangle((175, 90, 325, 430), radius=22, fill=(215, 220, 225, 255), outline=(180, 185, 190, 255), width=2)
        # Cuerpo cilíndrico
        draw.rounded_rectangle((177, 105, 323, 415), radius=16, fill=bc)
        # Brillo lateral de aluminio
        draw.line([(190, 110), (190, 410)], fill=(255, 255, 255, 90), width=6)
        # Etiqueta central
        draw.rounded_rectangle((182, 190, 318, 330), radius=12, fill=lc)

    elif "pouch" in p_type:
        # BOLSA DE AGUA PURA (250 ml)
        draw.rounded_rectangle((160, 120, 340, 420), radius=28, fill=bc, outline=(150, 205, 235, 255), width=3)
        # Sellado superior e inferior
        draw.rectangle((170, 120, 330, 138), fill=(160, 215, 240, 255))
        draw.rectangle((170, 402, 330, 420), fill=(160, 215, 240, 255))
        # Onda de agua
        draw.ellipse((165, 200, 335, 340), fill=lc)

    elif "glass_bottle" in p_type:
        # BOTELLA DE VIDRIO (355 ml / 450 ml / 600 ml)
        top_y = 65 if "tall" in p_type else 90
        # Tapa corona
        draw.rectangle((230, top_y, 270, top_y + 16), fill=cc)
        # Cuello de botella
        draw.polygon([(235, top_y + 16), (265, top_y + 16), (285, top_y + 110), (215, top_y + 110)], fill=bc)
        # Hombro y cuerpo
        draw.rounded_rectangle((185, top_y + 100, 315, 430), radius=20, fill=bc)
        # Reflejo vidrio
        draw.line([(200, top_y + 120), (200, 415)], fill=(255, 255, 255, 75), width=5)
        # Etiqueta cuerpo
        draw.rounded_rectangle((190, top_y + 180, 310, top_y + 285), radius=10, fill=lc)

    elif "sport" in p_type:
        # BOTELLA DEPORTIVA / PACHÓN (Gatorade / Tampico Pachón)
        # Chupón / Tapa deportiva
        draw.rectangle((240, 60, 260, 80), fill=(255, 255, 255, 255))
        draw.rounded_rectangle((230, 80, 270, 105), radius=4, fill=cc)
        # Cuello deportivo
        draw.rounded_rectangle((220, 105, 280, 135), radius=6, fill=bc)
        # Cuerpo ergonómico con agarres
        draw.rounded_rectangle((180, 130, 320, 430), radius=24, fill=bc)
        # Agarre central
        draw.ellipse((170, 240, 330, 290), fill=lc)
        # Reflejo
        draw.line([(195, 145), (195, 415)], fill=(255, 255, 255, 80), width=6)

    else:
        # BOTELLA PET (Agua Pura / Tampico botellita)
        top_y = 75 if "tall" in p_type else (135 if "small" in p_type else 100)
        # Tapa rosca
        draw.rectangle((234, top_y, 266, top_y + 20), fill=cc)
        # Cuello
        draw.polygon([(238, top_y + 20), (262, top_y + 20), (278, top_y + 70), (222, top_y + 70)], fill=bc)
        # Cuerpo estriado
        draw.rounded_rectangle((188, top_y + 65, 312, 430), radius=20, fill=bc)
        # Cintillo / Etiqueta
        draw.rounded_rectangle((190, 220, 310, 315), radius=8, fill=lc)
        # Reflejo
        draw.line([(202, top_y + 80), (202, 415)], fill=(255, 255, 255, 95), width=5)

    # 2. Textos Tipográficos Nítidos
    try:
        font_brand = ImageFont.truetype("arialbd.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 15)
        font_vol = ImageFont.truetype("arialbd.ttf", 13)
    except:
        font_brand = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_vol = ImageFont.load_default()

    # Badge de Marca Central
    center_y = 250
    b_text = item["brand"]
    s_text = item["sub"]
    v_text = item["vol"]

    # Calcular posiciones centradas
    b_w = draw.textlength(b_text, font=font_brand) if hasattr(draw, 'textlength') else len(b_text) * 14
    s_w = draw.textlength(s_text, font=font_sub) if hasattr(draw, 'textlength') else len(s_text) * 8
    v_w = draw.textlength(v_text, font=font_vol) if hasattr(draw, 'textlength') else len(v_text) * 7

    # Placa o texto de marca
    draw.text((250 - b_w / 2, center_y - 20), b_text, fill=tc, font=font_brand)
    draw.text((250 - s_w / 2, center_y + 12), s_text, fill=tc, font=font_sub)

    # Pastilla de volumen inferior
    draw.rounded_rectangle((250 - v_w / 2 - 8, 350, 250 + v_w / 2 + 8, 372), radius=6, fill=(255, 255, 255, 230), outline=(200, 205, 210, 255), width=1)
    draw.text((250 - v_w / 2, 354), v_text, fill=(30, 41, 59), font=font_vol)

    # Convertir a RGB (fondo blanco puro garantizado) y guardar
    final_img = Image.new("RGB", size, (255, 255, 255))
    final_img.paste(img, mask=img.split()[3])
    
    out_path = os.path.join(OUTPUT_DIR, item["filename"])
    final_img.save(out_path, "PNG", quality=95)
    print(f"Generado: {item['filename']}")

def main():
    print(f"Generando {len(PRODUCTS)} imagenes de productos con fondo blanco...")
    for prod in PRODUCTS:
        create_packshot(prod)
    print("Todas las imagenes se han guardado exitosamente en files/products/")

if __name__ == "__main__":
    main()
