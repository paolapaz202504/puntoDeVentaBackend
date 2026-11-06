import os
import sys
from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def convert_all_to_webp():
    prod_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../files/products"))
    png_files = [f for f in os.listdir(prod_dir) if f.endswith(".png")]
    
    print("=" * 65)
    print(f"🚀 INICIANDO CONVERSIÓN Y COMPRESIÓN WEBP PARA {len(png_files)} PRODUCTOS")
    print("=" * 65)
    
    total_png_bytes = 0
    total_webp_bytes = 0
    converted_count = 0
    
    for f in sorted(png_files):
        png_path = os.path.join(prod_dir, f)
        base_name = os.path.splitext(f)[0]
        webp_path = os.path.join(prod_dir, f"{base_name}.webp")
        
        png_size = os.path.getsize(png_path)
        total_png_bytes += png_size
        
        with Image.open(png_path) as img:
            # Convertir a RGB con fondo blanco puro si tiene canal alfa
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                rgb_img = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode != "RGBA":
                    img = img.convert("RGBA")
                rgb_img.paste(img, mask=img.split()[3])
            else:
                rgb_img = img.convert("RGB")
            
            # Guardar en WebP con compresión de alta calidad optimizada para packshots
            rgb_img.save(webp_path, "WEBP", quality=82, method=6)
            
        webp_size = os.path.getsize(webp_path)
        total_webp_bytes += webp_size
        converted_count += 1
        
        savings = (1 - webp_size / png_size) * 100
        print(f"[{converted_count:02d}/{len(png_files)}] {base_name[:30]:<30} | PNG: {png_size/1024:6.1f} KB -> WEBP: {webp_size/1024:5.1f} KB (-{savings:.1f}%)")

    total_png_mb = total_png_bytes / (1024 * 1024)
    total_webp_mb = total_webp_bytes / (1024 * 1024)
    overall_savings = (1 - total_webp_bytes / total_png_bytes) * 100
    
    print("\n" + "=" * 65)
    print(f"🎉 CONVERSIÓN COMPLETADA:")
    print(f"   - Total imágenes: {converted_count}")
    print(f"   - Tamaño original PNG: {total_png_mb:.2f} MB ({total_png_bytes:,} bytes)")
    print(f"   - Tamaño optimizado WebP: {total_webp_mb:.2f} MB ({total_webp_bytes:,} bytes)")
    print(f"   - Ahorro total de transferencia: {overall_savings:.2f}% ({total_png_mb - total_webp_mb:.2f} MB ahorrados)")
    print("=" * 65)

if __name__ == "__main__":
    convert_all_to_webp()
