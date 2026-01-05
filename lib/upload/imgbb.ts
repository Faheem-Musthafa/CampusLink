/**
 * ImgBB Image Upload Service
 * Free tier: Unlimited uploads, 32MB per image
 * Get your API key from: https://api.imgbb.com/
 */

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

export interface ImgBBUploadResponse {
  success: boolean;
  data: {
    id: string;
    url: string;
    display_url: string;
    delete_url: string;
    thumb: {
      url: string;
    };
    medium: {
      url: string;
    };
  };
}

export async function uploadToImgBB(file: File): Promise<string> {
  try {
    if (!IMGBB_API_KEY || IMGBB_API_KEY === "YOUR_API_KEY_HERE") {
      throw new Error("ImgBB API key missing. Set NEXT_PUBLIC_IMGBB_API_KEY in .env");
    }

    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Create form data
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64.split(",")[1]); // Remove data:image/xxx;base64, prefix

    // Upload to ImgBB
    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} ${text}`.trim());
    }

    const result: ImgBBUploadResponse = await response.json();

    if (!result.success) {
      throw new Error("Upload failed: ImgBB returned success=false");
    }

    return result.data.display_url;
  } catch (error) {
    console.error("ImgBB upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload image";
    throw new Error(message);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
