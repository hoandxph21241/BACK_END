var db = require("../model/db_song");
exports.Home = async (req, res, next) => {
  try {
    // const mp3List = await db.MP3.find().limit(6);
    const mp3List = await db.MP3.find();
    if (!mp3List || mp3List.length === 0) {
      return res.status(404).json({ error: "MP3 list not found" });
    }

    res.render("home/V_home.ejs", { mp3List: mp3List });
  } catch (err) {
    res.status(500).json({ error: "Error fetching MP3 list" });
  }
};
exports.Fetch = async (req, res, next) => {
  const limit = 6;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  try {
    const mp3List = await db.MP3.find().skip(offset).limit(limit);
    res.json(mp3List);
  } catch (err) {
    res.status(500).json({ error: "Error fetching MP3 list" });
  }
};
