import os
import io
import urllib.request
from PIL import Image, ImageOps

TARGET_SIZE = (600, 600)
PADDING_PCT = 0.06  # 6% padding on each side -> product fills ~88% of canvas

def crop_and_standardize_image(img_input, target_size=TARGET_SIZE, padding_pct=PADDING_PCT):
    """
    Takes a PIL Image or bytes, strips white background margins, 
    scales proportionally, and pastes onto a centered pure white square canvas.
    """
    if isinstance(img_input, bytes):
        img = Image.open(io.BytesIO(img_input)).convert('RGB')
    elif isinstance(img_input, str):
        img = Image.open(img_input).convert('RGB')
    else:
        img = img_input.convert('RGB')
        
    w, h = img.size
    
    # Analyze background corners to determine background color
    corners = [
        img.getpixel((0, 0)),
        img.getpixel((w - 1, 0)),
        img.getpixel((0, h - 1)),
        img.getpixel((w - 1, h - 1))
    ]
    # Check if corners are near white
    avg_corner = sum(sum(c) for c in corners) / (4 * 3)
    
    # Create mask for pixels that are NOT background
    # If corner is near white (>240), use threshold 244
    gray = ImageOps.grayscale(img)
    thresh = 244 if avg_corner > 230 else 240
    table = [255 if i > thresh else 0 for i in range(256)]
    mask = gray.point(table, mode='L')
    inverted_mask = ImageOps.invert(mask)
    bbox = inverted_mask.getbbox()
    
    if bbox:
        # Extra 2px safety margin inwards if bbox touches border
        bx1, by1, bx2, by2 = bbox
        if bx2 - bx1 > 10 and by2 - by1 > 10:
            cropped = img.crop(bbox)
        else:
            cropped = img
    else:
        cropped = img
        
    cw, ch = cropped.size
    tw, th = target_size
    max_w = int(tw * (1.0 - padding_pct * 2))
    max_h = int(th * (1.0 - padding_pct * 2))
    
    scale = min(max_w / cw, max_h / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))
    
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Pure white square background
    out = Image.new('RGB', target_size, (255, 255, 255))
    paste_x = (tw - new_w) // 2
    paste_y = (th - new_h) // 2
    out.paste(resized, (paste_x, paste_y))
    return out

def download_and_process(url, out_path):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = resp.read()
        res = crop_and_standardize_image(data)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        res.save(out_path, 'PNG', optimize=True)
        print(f"Downloaded & processed: {out_path} ({res.size})")

def optimize_local_files():
    prod_dir = os.path.abspath('backend/files/products')
    if not os.path.exists(prod_dir):
        print(f"Directory {prod_dir} does not exist.")
        return
        
    files = [f for f in os.listdir(prod_dir) if f.endswith('.png')]
    print(f"Optimizing {len(files)} local product packshots in {prod_dir}...")
    for f in files:
        full_path = os.path.join(prod_dir, f)
        try:
            res = crop_and_standardize_image(full_path)
            res.save(full_path, 'PNG', optimize=True)
            print(f"  Optimized: {f}")
        except Exception as e:
            print(f"  Error on {f}: {e}")

if __name__ == '__main__':
    # 1. Process specific user examples
    print("=== Downloading and processing user specified examples ===")
    user_examples = {
        'backend/files/products/coca_cola_lata_354.png': 'https://ferreteriavidri.com/images/items/large/165359.jpg?v=26920',
        'backend/files/products/pan_con_pollo_mayonesa.png': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPQilZ-Rd9Uf9oaJ1iYHmkCfBEx3picn16N-2ixgYZWQ&s=10'
    }
    for dest, url in user_examples.items():
        try:
            download_and_process(url, dest)
        except Exception as e:
            print(f"Error downloading {dest}: {e}")

    # 2. Optimize all other existing packshots
    print("\n=== Auto-cropping and expanding all packshots ===")
    optimize_local_files()
