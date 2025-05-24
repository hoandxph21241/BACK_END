var db = require("../model/db_song");
// exports.Home = async (req, res, next) => {
//   try {
//     // const mp3List = await db.MP3.find().limit(6);
//     const mp3List = await db.MP3.find()
//       .populate({
//         path: "categoryId",
//         select: "nameCategory",
//       })
//       .lean();

//     // if (!mp3List || mp3List.length === 0) {
//     //   return res.status(404).json({ error: "MP3 list not found" });
//     // }
//     res.render("home/V_home.ejs", { mp3List: mp3List });
//   } catch (err) {
//     res.status(500).json({ error: "Error fetching MP3 list" });
//   }
// };
exports.Home = async (req, res, next) => {
  try {
    // const mp3List = await db.MP3.find().limit(6);
    const mp3List = await db.MP3.find()
      .populate({
        path: "categoryId",
        select: "nameCategory",
      })
      .lean();

    // if (!mp3List || mp3List.length === 0) {
    //   return res.status(404).json({ error: "MP3 list not found" });
    // }
    res.render("home/Home.ejs", { mp3List: mp3List });
  } catch (err) {
    res.status(500).json({ error: "Error fetching MP3 list" });
  }
};
exports.Home_NEW = async (req, res, next) => {
  try {
    // const mp3List = await db.MP3.find().limit(6);
    const mp3List = await db.MP3.find()
    .select('-data -userID')
      .populate({
        path: "categoryId",
        select: "nameCategory _id",
      })
      .lean();

    // if (!mp3List || mp3List.length === 0) {
    //   return res.status(404).json({ error: "MP3 list not found" });
    // }

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
exports.Find_ID = async (req, res, next) => {
  const id = req.params.id;
  try {
    const data = await db.MP3.findById(id)
    // .select("-name -image -categoryId -userID")
    .select('-userID -image')
    .lean();
    console.log("Rounter"+data);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({error:"Error data"});
  }
};
// Lấy danh sách id các bài hát cùng thể loại
exports.GetSongsByCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId; // Thể loại của bài hát hiện tại
  try {
    console.log(categoryId);
    const songs = await db.MP3.find({ categoryId: categoryId }) // Lọc theo thể loại
      .select('_id name') // Chỉ trả về id và name
      .lean();
      console.log(songs.name)
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh sách bài hát" });
  }
};
