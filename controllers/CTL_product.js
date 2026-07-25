var db = require("../model/db_song");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_API_URL = process.env.IMGBB_API_URL;
const MP3_MAX_SIZE = 50 * 1024 * 1024;
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;

// Hàm fix UTF-8 encoding cho tiếng việt
function fixVietnameseFileName(fileName) {
  if (!fileName) return '';
  
  try {
  // Nếu tên file đã bị encode sai thành Latin-1, decode lại
    if (fileName.includes('Ãƒ') || fileName.includes('Âº') || fileName.includes('Ã¡Â»') || 
        fileName.includes('ÃƒÂ¡') || fileName.includes('ÃƒÂ©') || fileName.includes('ÃƒÂ­') ||
        fileName.includes('ÃƒÂ³') || fileName.includes('ÃƒÂº') || fileName.includes('ÃƒÂ¢') ||
        fileName.includes('ÃƒÂª') || fileName.includes('ÃƒÂ´') || fileName.includes('ÃƒÂ¢') ||
        fileName.includes('Ã„') || fileName.includes('Ã†Â°') || fileName.includes('Ã†Â¡')) {
      // Decode tá»« Latin-1 sang UTF-8
      const buffer = Buffer.from(fileName, 'latin1');
      const utf8String = buffer.toString('utf8');
      return utf8String;
    }
    
    // Nếu tên đã URL encoded
    if (fileName.includes('%')) {
      return decodeURIComponent(fileName);
    }
    
    // Nếu tên đã đúng UTF-8
    return fileName;
  } catch (error) {
    console.error('Error fixing Vietnamese filename:', error);
    return fileName; // Trả về tên gốc nếu không thể fix
  }
}

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
    // Fix UTF-8 cho originalname
    const fixedOriginalName = fixVietnameseFileName(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(fixedOriginalName));
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
    fileSize: MP3_MAX_SIZE
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

function normalizeEmpty(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseOptionalNumber(value) {
  const normalized = normalizeEmpty(value);
  if (normalized === null) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value) {
  const normalized = normalizeEmpty(value);
  if (normalized === null) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildImageUpdate(body, existingImage) {
  return {
    url: normalizeEmpty(body.imageUrl),
    display_url: normalizeEmpty(body.imageDisplayUrl),
    delete_url: normalizeEmpty(body.imageDeleteUrl),
    thumb: {
      filename: normalizeEmpty(body.imageThumbFilename),
      name: normalizeEmpty(body.imageThumbName),
      mime: normalizeEmpty(body.imageThumbMime),
      extension: normalizeEmpty(body.imageThumbExtension),
      url: normalizeEmpty(body.imageThumbUrl),
    },
    originalName: normalizeEmpty(body.imageOriginalName) || existingImage?.originalName || null,
  };
}

exports.EditSongsPage = async (req, res) => {
  try {
    const [songs, categories] = await Promise.all([
      db.MP3.find()
        .select('name artist categoryId userID originalName fileSize duration uploadDate image')
        .populate({ path: 'categoryId', select: 'nameCategory' })
        .sort({ uploadDate: -1 })
        .lean(),
      db.CategoryModel.find().sort({ nameCategory: 1 }).lean(),
    ]);

    res.render('product/V_update_songs.ejs', {
      songs,
      categories,
      success: req.query.success || '',
      error: req.query.error || '',
    });
  } catch (error) {
    console.error('Error loading update songs page:', error);
    res.status(500).render('error', { message: 'Unable to load songs update page' });
  }
};

exports.UpdateSong = async (req, res) => {
  try {
    const song = await db.MP3.findById(req.params.id);
    const imageFile = req.files?.imageFile?.[0];
    if (!song) {
      if (imageFile && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
      return res.redirect('/product/update?error=Song%20not%20found');
    }

    const categoryId = normalizeEmpty(req.body.categoryId);
    if (categoryId) {
      const categoryExists = await db.CategoryModel.exists({ _id: categoryId });
      if (!categoryExists) {
        if (imageFile && fs.existsSync(imageFile.path)) {
          fs.unlinkSync(imageFile.path);
        }
        return res.redirect('/product/update?error=Category%20not%20found');
      }
    }

    const uploadDate = parseOptionalDate(req.body.uploadDate);
    let imageUpdate = buildImageUpdate(req.body, song.image);

    if (imageFile) {
      if (imageFile.size > IMAGE_MAX_SIZE) {
        if (fs.existsSync(imageFile.path)) {
          fs.unlinkSync(imageFile.path);
        }
        return res.redirect('/product/update?error=Image%20must%20be%20under%205MB');
      }

      const imgbbResult = await uploadImageToImgBB(imageFile.path);
      if (!imgbbResult.success) {
        if (fs.existsSync(imageFile.path)) {
          fs.unlinkSync(imageFile.path);
        }
        return res.redirect('/product/update?error=Image%20upload%20failed');
      }

      imageUpdate = {
        url: imgbbResult.data.url,
        display_url: imgbbResult.data.display_url,
        delete_url: imgbbResult.data.delete_url,
        thumb: imgbbResult.data.thumb,
        originalName: fixVietnameseFileName(imageFile.originalname),
      };

      if (fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
    }

    const updateData = {
      name: normalizeEmpty(req.body.name) || song.name,
      artist: normalizeEmpty(req.body.artist),
      categoryId: categoryId,
      userID: normalizeEmpty(req.body.userID),
      originalName: normalizeEmpty(req.body.originalName),
      fileSize: parseOptionalNumber(req.body.fileSize),
      duration: parseOptionalNumber(req.body.duration),
      image: imageUpdate,
    };

    if (uploadDate) {
      updateData.uploadDate = uploadDate;
    }

    await db.MP3.findByIdAndUpdate(req.params.id, updateData, { runValidators: true });
    res.redirect('/product/update?success=Song updated');
  } catch (error) {
    if (req.files?.imageFile?.[0]?.path && fs.existsSync(req.files.imageFile[0].path)) {
      fs.unlinkSync(req.files.imageFile[0].path);
    }
    console.error('Error updating song:', error);
    res.redirect('/product/update?error=Update%20failed');
  }
};
exports.uploadFiles = upload.fields([
  { name: 'mp3File', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]);

exports.updateImageFile = upload.fields([
  { name: 'imageFile', maxCount: 1 }
]);

exports.saveMP3 = async (req, res) => {
  try {
    let { name, artist, duration } = req.body;
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

    if (mp3File.size > MP3_MAX_SIZE) {
      if (mp3File && fs.existsSync(mp3File.path)) {
        fs.unlinkSync(mp3File.path);
      }
      if (imageFile && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
      return res.status(400).json({
        success: false,
        error: 'File MP3 qua lon! Toi da 50MB.'
      });
    }

    if (imageFile && imageFile.size > IMAGE_MAX_SIZE) {
      if (mp3File && fs.existsSync(mp3File.path)) {
        fs.unlinkSync(mp3File.path);
      }
      if (imageFile && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
      return res.status(400).json({
        success: false,
        error: 'File anh qua lon! Toi da 5MB.'
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

    if (!name || name.trim() === '') {
      const fixedOriginalName = fixVietnameseFileName(mp3File.originalname);
      name = path.parse(fixedOriginalName).name;
    } else {
      name = fixVietnameseFileName(name);
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
          originalName: fixVietnameseFileName(imageFile.originalname)
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
      artist: artist?.trim() || null,
      categoryId: categoryId,
      data: mp3Data,
      originalName: fixVietnameseFileName(mp3File.originalname),
      fileSize: mp3File.size,
      duration: duration ? Number(duration) : null,
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
        artist: savedMP3.artist,
        categoryId: savedMP3.categoryId,
        duration: savedMP3.duration,
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
        error: "File quá lớn! MP3 tối đa 50MB, ảnh tối đa 5MB." 
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
        error: "File quá lớn! MP3 tối đa 50MB, ảnh tối đa 5MB." 
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



