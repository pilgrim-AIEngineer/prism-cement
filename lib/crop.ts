// Client-side crop helper. Converts the pixel area chosen in react-easy-crop into
// a cropped square PNG File, ready to attach to the brand-logo FormData.
//
// react-easy-crop returns `croppedAreaPixels` ({ x, y, width, height }) relative
// to the natural image size; we draw that region onto a canvas and export it.

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load image")));
    image.src = src;
  });
}

// `imageSrc` is the object URL of the file the admin picked. Returns a square PNG
// File cropped to `pixelCrop`. The server still cover-resizes to a fixed size, so
// the exact output dimensions here only need to be square.
export async function getCroppedFile(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName = "brand-logo.png",
): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Could not export cropped image");

  return new File([blob], fileName, { type: "image/png" });
}
