import os
from PIL import Image

def resize_grid_sprite(input_path, output_path, cols, rows, target_frame_size=128):
    try:
        if not os.path.exists(input_path):
            print(f"Error: File not found - {input_path}")
            return False

        img = Image.open(input_path)

        # Determine original frame size
        orig_w, orig_h = img.size
        frame_w = orig_w // cols
        frame_h = orig_h // rows

        # Create new image
        new_w = target_frame_size * cols
        new_h = target_frame_size * rows
        new_img = Image.new("RGB", (new_w, new_h), (0, 0, 0)) # Black background for AdditiveBlending

        for row in range(rows):
            for col in range(cols):
                # Extract frame
                left = col * frame_w
                top = row * frame_h
                right = left + frame_w
                bottom = top + frame_h
                frame = img.crop((left, top, right, bottom))

                # Resize logic (Fit within 128x128, maintain aspect ratio)
                ratio = min(target_frame_size / frame_w, target_frame_size / frame_h)
                new_frame_w = int(frame_w * ratio)
                new_frame_h = int(frame_h * ratio)

                resized_frame = frame.resize((new_frame_w, new_frame_h), Image.LANCZOS)

                # Paste into new canvas (Bottom-Center alignment)
                # X: Center
                paste_x = (col * target_frame_size) + (target_frame_size - new_frame_w) // 2
                # Y: Bottom
                paste_y = (row * target_frame_size) + (target_frame_size - new_frame_h)

                new_img.paste(resized_frame, (paste_x, paste_y))

        new_img.save(output_path, quality=95)
        print(f"Success: {output_path} ({new_w}x{new_h})")
        return True

    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return False

# Configuration
jobs = [
    {
        "input": "Lumenfall-juego/assets/sprites/Joziel/Sombras-efectos/Sombra-correr.jpg",
        "output": "Lumenfall-juego/assets/sprites/Joziel/Sombras-efectos/Sombra-correr_128.jpg",
        "cols": 8,
        "rows": 2
    },
    {
        "input": "Lumenfall-juego/assets/sprites/Joziel/Sombras-efectos/Idle-sombra.jpg",
        "output": "Lumenfall-juego/assets/sprites/Joziel/Sombras-efectos/Idle-sombra_128.jpg",
        "cols": 5,
        "rows": 1
    }
]

print("Starting Shadow Standardization...")
for job in jobs:
    resize_grid_sprite(job["input"], job["output"], job["cols"], job["rows"])
