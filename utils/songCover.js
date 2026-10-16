const fs = require("fs/promises");
const axios = require("axios");

async function uploadImageToImgBB(imagePath) {
  const key = process.env.IMGBB_API_KEY;
  const url = process.env.IMGBB_API_URL;
  const configuredTimeout = Number(process.env.IMGBB_TIMEOUT_MS);
  const timeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.min(Math.max(configuredTimeout, 1000), 120000) : 60000;
  if (!key || !url) {
    return { success: false, status: 503, error: "Chưa cấu hình dịch vụ ảnh bìa ImgBB." };
  }
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const formData = new FormData();
    formData.append("key", key);
    formData.append("image", imageBuffer.toString("base64"));
    // Axios supplies the multipart boundary. Do not retry an ambiguous upload timeout.
    const response = await axios.post(url, formData, { timeout });
    const image = response.data?.data;
    if (!response.data?.success || typeof image?.url !== "string" || !image.url) {
      console.error("ImgBB cover upload failed:", { reason: "invalid_response" });
      return { success: false, status: 502, error: "Dịch vụ ImgBB trả về dữ liệu ảnh không hợp lệ. Vui lòng thử lại." };
    }
    return { success: true, data: {
      url: image.url, display_url: image.display_url,
      delete_url: image.delete_url, thumb: image.thumb,
    } };
  } catch (error) {
    const timedOut = ["ECONNABORTED", "ETIMEDOUT"].includes(error.code);
    // Never log Axios config/request: they may contain the API key and image data.
    console.error("ImgBB cover upload failed:", {
      code: error.code || "UPLOAD_ERROR", status: error.response?.status, timeout: timedOut,
    });
    return {
      success: false,
      status: timedOut ? 504 : 502,
      error: timedOut
        ? "ImgBB phản hồi quá chậm. Ảnh bìa và bài hát chưa được lưu. Vui lòng thử lại sau."
        : "Không thể gửi ảnh bìa tới ImgBB. Vui lòng kiểm tra kết nối hoặc thử lại sau.",
    };
  }
}
module.exports = uploadImageToImgBB;

// Previous uploader retained for reference.
// const fs = require("fs");
// const axios = require("axios");
// const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
// const IMGBB_API_URL = process.env.IMGBB_API_URL;
// async function uploadImageToImgBB(imagePath) {
//   try {
//     const imageBuffer = fs.readFileSync(imagePath);
//     const base64Image = imageBuffer.toString('base64');
//     const formData = new FormData();
//     formData.append('key', IMGBB_API_KEY);
//     formData.append('image', base64Image);
//     const response = await axios.post(IMGBB_API_URL, formData, {
//       headers: {
//         'Content-Type': 'multipart/form-data'
//       },
//       timeout: 30000
//     });
//     
//     if (response.data && response.data.success) {
//       return {
//         success: true,
//         data: {
//           url: response.data.data.url,
//           display_url: response.data.data.display_url,
//           delete_url: response.data.data.delete_url,
//           thumb: response.data.data.thumb
//         }
//       };
//     } else {
//       throw new Error('ImgBB API response không hợp lệ');
//     }
//   } catch (error) {
//     console.error('Error uploading to ImgBB:', error);
//     return {
//       success: false,
//       error: error.message || 'Lỗi upload ảnh lên ImgBB'
//     };
//   }
// }
// 
// 
// module.exports = uploadImageToImgBB;
