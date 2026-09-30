/**
 * Helper para subir imágenes a Cloudinary
 * 
 * Variables de entorno necesarias:
 * - CLOUDINARY_CLOUD_NAME: Tu cloud name (ej: ugvabt6u)
 * - CLOUDINARY_UPLOAD_PRESET: El nombre del upload preset (ej: barriodesk_products)
 */

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "ugvabt6u";
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "barriodesk_products";

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Sube una imagen a Cloudinary
 * @param file - Archivo de imagen (File o Blob)
 * @returns Promise con la respuesta de Cloudinary
 */
export async function uploadImage(file: File | Blob): Promise<CloudinaryResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Error al subir imagen");
  }

  const data = await response.json();
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    format: data.format,
    width: data.width,
    height: data.height,
  };
}

/**
 * Genera una URL de imagen con transformaciones de Cloudinary
 * @param publicId - ID público de la imagen en Cloudinary
 * @param width - Ancho deseado (opcional)
 * @param height - Alto deseado (opcional)
 * @returns URL de la imagen
 */
export function getImageUrl(publicId: string, width?: number, height?: number): string {
  let url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  if (width || height) {
    const transformations: string[] = [];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push("c_fill");
    transformations.push("f_auto");
    transformations.push("q_auto");
    url += `/${transformations.join(",")}`;
  }
  
  url += `/${publicId}`;
  return url;
}
