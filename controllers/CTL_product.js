var db = require("../model/db_song");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_API_URL = process.env.IMGBB_API_URL;


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'mp3File') {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file MP3!'), false);
    }
  } else if (file.fieldname === 'imageFile') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
  } else {
    cb(new Error('Field không hợp lệ!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

async function uploadImageToImgBB(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Image);
    const response = await axios.post(IMGBB_API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        data: {
          url: response.data.data.url,
          display_url: response.data.data.display_url,
          delete_url: response.data.data.delete_url,
          thumb: response.data.data.thumb
        }
      };
    } else {
      throw new Error('ImgBB API response không hợp lệ');
    }
  } catch (error) {
    console.error('Error uploading to ImgBB:', error);
    return {
      success: false,
      error: error.message || 'Lỗi upload ảnh lên ImgBB'
    };
  }
}

exports.Product = async (req, res, next) => {
  try {
    let listidCategory = await db.CategoryModel.find();
    res.render("product/V_product.ejs", { 
      listidCategory: listidCategory || [] 
    });
  } catch (error) {
    console.error("Error loading categories:", error);
    res.render("product/V_product.ejs", { 
      listidCategory: [] 
    });
  }
};  

exports.uploadFiles = upload.fields([
  { name: 'mp3File', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]);

exports.saveMP3 = async (req, res) => {
  try {
    let { name } = req.body;
    const { categoryId } = req.body;
    const mp3File = req.files?.mp3File?.[0];
    const imageFile = req.files?.imageFile?.[0];

    if (!mp3File) {
      if (imageFile && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
      return res.status(400).json({ 
        success: false, 
        error: "Vui lòng chọn file MP3!" 
      });
    }

    if (!categoryId) {
      if (mp3File && fs.existsSync(mp3File.path)) {
        fs.unlinkSync(mp3File.path);
      }
      if (imageFile && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
      return res.status(400).json({ 
        success: false, 
        error: "Vui lòng chọn danh mục!" 
      });
    }

    const categoryExists = await db.CategoryModel.findById(categoryId);
    if (!categoryExists) {
      if (mp3File && fs.existsSync(mp3File.path)) {
        fs.unlinkSync(mp3File.path);
      }
      if (imageFile && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
      return res.status(400).json({ 
        success: false, 
        error: "Danh mục không tồn tại!" 
      });
    }

    // Fix UTF-8 decoding for title
    if (!name || name.trim() === '') {
      let originalFileName = path.parse(mp3File.originalname).name;
      
      // Decode UTF-8 properly for Vietnamese characters
      try {
        // Try to decode if it's URL encoded
        originalFileName = decodeURIComponent(originalFileName);
      } catch (e) {
        // If decoding fails, keep original
      }
      
      // Convert buffer to proper UTF-8 string if needed
      try {
        const buffer = Buffer.from(originalFileName, 'latin1');
        const utf8String = buffer.toString('utf8');
        // Check if conversion looks correct (contains Vietnamese chars)
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(utf8String)) {
          originalFileName = utf8String;
        }
      } catch (e) {
        // If conversion fails, keep original
      }
      
      name = originalFileName;
    }

    let imageData = null;
    if (imageFile) {
      console.log('Uploading image to ImgBB...');
      const imgbbResult = await uploadImageToImgBB(imageFile.path);
      
      if (imgbbResult.success) {
        imageData = {
          url: imgbbResult.data.url,
          display_url: imgbbResult.data.display_url,
          delete_url: imgbbResult.data.delete_url,
          thumb: imgbbResult.data.thumb,
          originalName: imageFile.originalname
        };
        console.log('Image uploaded successfully to ImgBB:', imageData.url);
      } else {
        if (mp3File && fs.existsSync(mp3File.path)) {
          fs.unlinkSync(mp3File.path);
        }
        if (imageFile && fs.existsSync(imageFile.path)) {
          fs.unlinkSync(imageFile.path);
        }
        return res.status(400).json({ 
          success: false, 
          error: `Lỗi upload ảnh: ${imgbbResult.error}` 
        });
      }
    }
    
    const mp3Data = fs.readFileSync(mp3File.path);

    const newMP3 = new db.MP3({
      name: name.trim(),
      categoryId: categoryId,
      data: mp3Data,
      originalName: mp3File.originalname,
      fileSize: mp3File.size,
      uploadDate: new Date(),
      image: imageData
    });

    const savedMP3 = await newMP3.save();

    if (mp3File && fs.existsSync(mp3File.path)) {
      fs.unlinkSync(mp3File.path);
    }
    if (imageFile && fs.existsSync(imageFile.path)) {
      fs.unlinkSync(imageFile.path);
    }

    console.log(`MP3 uploaded successfully: ${name} / Category: ${categoryId} / ID: ${savedMP3._id}`);
    if (imageData) {
      console.log(`Image uploaded successfully: ${imageData.url}`);
    }

    res.status(200).json({ 
      success: true, 
      message: "Upload thành công!",
      data: {
        id: savedMP3._id,
        name: savedMP3.name,
        categoryId: savedMP3.categoryId,
        imageUrl: imageData?.url || null
      }
    });

  } catch (err) {
    console.error("Error uploading MP3:", err);
    
    if (req.files) {
      if (req.files.mp3File && req.files.mp3File[0] && fs.existsSync(req.files.mp3File[0].path)) {
        fs.unlinkSync(req.files.mp3File[0].path);
      }
      if (req.files.imageFile && req.files.imageFile[0] && fs.existsSync(req.files.imageFile[0].path)) {
        fs.unlinkSync(req.files.imageFile[0].path);
      }
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: "File quá lớn! Tối đa 50MB." 
      });
    }

    if (err.message.includes('MP3') || err.message.includes('ảnh')) {
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        error: "Dữ liệu không hợp lệ!" 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: "Có lỗi xảy ra trong quá trình upload!" 
    });
  }
};


exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: "File quá lớn! Tối đa 50MB." 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: "Lỗi upload file!" 
    });
  }
  
  if (err.message === 'Chỉ chấp nhận file MP3!' || err.message === 'Chỉ chấp nhận file ảnh!') {
    return res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  }
  
  next(err);
};