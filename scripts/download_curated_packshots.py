import os
import sys
import io
import urllib.request
from PIL import Image

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from optimize_packshots import crop_and_standardize_image

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

CURATED_URLS = {
    # Tostadas
    'tostada_pollo_mayonesa.png': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
    'tostada_pollo_seco.png': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',
    'tostada_chaomin.png': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    'tostada_jamon.png': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
    'tostada_verdura.png': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    
    # Licuados
    'licuado_fresa_16oz.png': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
    'licuado_mixto_16oz.png': 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80',
    
    # Refrescos Naturales
    'refresco_jamaica.png': 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
    'refresco_melon.png': 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80',
    'refresco_mora.png': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    'refresco_pina.png': 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80',
    'refresco_tamarindo.png': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    'refresco_vinagre.png': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    
    # Sub-ensambles
    'sub_pollo_seco.png': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
    'sub_verdura_preparada.png': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    
    # Insumos y Materias Primas
    'ins_agua_purificada.png': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    'ins_arroz_blanco.png': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    'ins_avena_hojuelas.png': 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?auto=format&fit=crop&w=600&q=80',
    'ins_azucar_blanca.png': 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80',
    'ins_banano_maduro.png': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
    'ins_canela_rama.png': 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=600&q=80',
    'ins_cereal_maiz.png': 'https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=600&q=80',
    'ins_chilacayote_crudo.png': 'https://images.unsplash.com/photo-1570586435893-bb9aed7b00dd?auto=format&fit=crop&w=600&q=80',
    'ins_chocomilk_polvo.png': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80',
    'ins_ejote_frances.png': 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=80',
    'ins_fideos_chaomin.png': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
    'ins_flor_jamaica.png': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80',
    'ins_fresa_fresca.png': 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80',
    'ins_jamon_pierna.png': 'https://images.unsplash.com/photo-1524438418049-ab2acb7aa48f?auto=format&fit=crop&w=600&q=80',
    'ins_esencia_crema.png': 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&w=600&q=80',
    'ins_leche_entera.png': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    'ins_mayonesa_comercial.png': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    'ins_melon_fresco.png': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=600&q=80',
    'ins_mora_silvestre.png': 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=600&q=80',
    'ins_pan_frances.png': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    'ins_panela_dulce.png': 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80',
    'ins_pina_madura.png': 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80',
    'ins_pollo_crudo.png': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80',
    'ins_remolacha_cruda.png': 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80',
    'ins_tamarindo_vaina.png': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
    'ins_tostadas_maiz.png': 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
    'ins_zanahoria_cruda.png': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=600&q=80',
}

def main():
    target_dir = os.path.abspath('backend/files/products')
    os.makedirs(target_dir, exist_ok=True)
    
    total = len(CURATED_URLS)
    print(f"Downloading and standardizing {total} curated product packshots...")
    
    success = 0
    for i, (fname, url) in enumerate(CURATED_URLS.items(), 1):
        dest_path = os.path.join(target_dir, fname)
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = resp.read()
                processed = crop_and_standardize_image(data)
                processed.save(dest_path, 'PNG', optimize=True)
                success += 1
                print(f"[{i}/{total}] OK: {fname} ({processed.size})")
        except Exception as e:
            print(f"[{i}/{total}] ERROR {fname}: {e}")
            
    print(f"\nCompleted: {success}/{total} images downloaded and standardized.")

if __name__ == '__main__':
    main()
