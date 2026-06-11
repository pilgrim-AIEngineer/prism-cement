from PIL import Image
import sys

def remove_white_bg(img_path, out_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        datas = img.getdata()
        new_data = []
        for item in datas:
            # Change white and near-white pixels to transparent
            if item[0] > 230 and item[1] > 230 and item[2] > 230:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)
        img.save(out_path, "PNG")
        print(f"Successfully processed {img_path} to {out_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    remove_white_bg("public/assets/logo.png", "public/assets/logo_transparent.png")
