import os
from PIL import Image

def standardize_sprite(input_path, output_path, cols, rows, target_size=128):
    try:
        if not os.path.exists(input_path):
            print(f"Error: Not found - {input_path}")
            return

        img = Image.open(input_path)
        orig_w, orig_h = img.size
        frame_w = orig_w // cols
        frame_h = orig_h // rows

        # New Sheet Size
        sheet_w = target_size * cols
        sheet_h = target_size * rows

        # Create transparent RGBA image
        new_sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

        for r in range(rows):
            for c in range(cols):
                # Extract
                left = c * frame_w
                top = r * frame_h
                frame = img.crop((left, top, left + frame_w, top + frame_h))

                # Resize (Fit in 128x128)
                ratio = min(target_size / frame_w, target_size / frame_h)
                new_fw = int(frame_w * ratio)
                new_fh = int(frame_h * ratio)

                # Use LANCZOS for quality
                resized = frame.resize((new_fw, new_fh), Image.LANCZOS)

                # Paste Position: Center X, Bottom Y
                paste_x = (c * target_size) + (target_size - new_fw) // 2
                paste_y = (r * target_size) + (target_size - new_fh)

                new_sheet.paste(resized, (paste_x, paste_y))

        new_sheet.save(output_path)
        print(f"Generated: {output_path} ({sheet_w}x{sheet_h})")

    except Exception as e:
        print(f"Error processing {input_path}: {e}")

# Job List
# Paths relative to repo root
jobs = [
    # Idle (5x1)
    {"in": "Lumenfall-juego/assets/sprites/Joziel/Movimiento/Idle.png", "out": "Lumenfall-juego/assets/sprites/Joziel/Movimiento/Idle_128.png", "c": 5, "r": 1},
    # Correr (8x2)
    {"in": "Lumenfall-juego/assets/sprites/Joziel/Movimiento/Correr-1.png", "out": "Lumenfall-juego/assets/sprites/Joziel/Movimiento/Correr-1_128.png", "c": 8, "r": 2},
    # Saltar (3x2)
    {"in": "Lumenfall-juego/assets/sprites/Joziel/Movimiento/saltar.png", "out": "Lumenfall-juego/assets/sprites/Joziel/Movimiento/saltar_128.png", "c": 3, "r": 2},
    # Attack (6x1) - Note: In root of Joziel/
    {"in": "Lumenfall-juego/assets/sprites/Joziel/attack_sprite_sheet.png", "out": "Lumenfall-juego/assets/sprites/Joziel/attack_sprite_sheet_128.png", "c": 6, "r": 1},
    # Idle Back (6x1)
    {"in": "Lumenfall-juego/assets/sprites/Joziel/Movimiento-B/idle-B.png", "out": "Lumenfall-juego/assets/sprites/Joziel/Movimiento-B/idle-B_128.png", "c": 6, "r": 1},
    # Correr Back (8x2)
    {"in": "Lumenfall-juego/assets/sprites/Joziel/Movimiento-B/Movimiento-B-1.png", "out": "Lumenfall-juego/assets/sprites/Joziel/Movimiento-B/Movimiento-B-1_128.png", "c": 8, "r": 2},
    # Saltar Back (8x1)
    {"in": "Lumenfall-juego/assets/sprites/Joziel/Movimiento-B/saltar-b.png", "out": "Lumenfall-juego/assets/sprites/Joziel/Movimiento-B/saltar-b_128.png", "c": 8, "r": 1},
]

if __name__ == "__main__":
    for j in jobs:
        standardize_sprite(j["in"], j["out"], j["c"], j["r"])
