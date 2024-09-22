var db = require("../model/db_song");

exports.Product = async (req, res, next) => {
    res.render("product/V_product.ejs");
};  

const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");
exports.uploadMP3 = upload.single("mp3File");
exports.saveMP3 = async (req, res) => {
  try {
    let { name } = req.body;
    const mp3File = req.file;
    if (!mp3File) {
      return res.status(400).json({ error: "Please upload an MP3 file" });
    }
    if (!name) {
      name = mp3File.originalname;
    }
    const mp3Data = fs.readFileSync(mp3File.path);
    const newMP3 = new db.MP3({
      name: name,
      data: mp3Data,
    });
    const savedMP3 = await newMP3.save();
    res.redirect('/home');
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Error uploading MP3" });
  }
};
