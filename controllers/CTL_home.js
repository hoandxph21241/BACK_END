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
exports.Home_pratical = async (req, res, next) => {
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
    res.render("home/Home_patical.ejs", { mp3List: mp3List });
  } catch (err) {
    res.status(500).json({ error: "Error fetching MP3 list" });
  }
};

exports.CT_Home = async (req, res, next) => {
  try {
    // Lấy tất cả MP3 với populate category
    const mp3List = await db.MP3.find()
      .populate({
        path: "categoryId",
        select: "nameCategory",
      })
      .sort({ uploadDate: -1 }) // Sắp xếp theo ngày upload mới nhất
      .lean();

    // Lấy danh sách các category để tạo sections
    const categories = await db.CategoryModel.find().lean();

    // Tạo object để group songs theo category
    const songsByCategory = {};
    
    // Khởi tạo các category
    categories.forEach(category => {
      songsByCategory[category._id] = {
        name: category.nameCategory,
        songs: []
      };
    });

    // Phân loại các bài hát
    mp3List.forEach(song => {
      if (song.categoryId && songsByCategory[song.categoryId._id]) {
        if (songsByCategory[song.categoryId._id].songs.length < 5) {
          songsByCategory[song.categoryId._id].songs.push(song);
        }
      }
    });

    // Tạo top rated songs (5 bài mới nhất hoặc bạn có thể thêm logic rating)
    const topRatedSongs = mp3List.slice(0, 5);

    res.render("home/CT_Home.ejs", { 
      mp3List: mp3List,
      songsByCategory: songsByCategory,
      topRatedSongs: topRatedSongs,
      categories: categories
    });
    
  } catch (err) {
    console.error("Error fetching MP3 list:", err);
    res.status(500).render("home/CT_Home.ejs", { 
      mp3List: [],
      songsByCategory: {},
      topRatedSongs: [],
      categories: []
    });
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
      .select('-userID') // 👈 Chỉ loại userID, giữ image
      .lean();

    console.log("Router Find_ID:", {
      name: data?.name,
      image: data?.image?.url || 'No image',
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error in Find_ID:", error);
    res.status(500).json({ error: "Error data" });
  }
};

exports.GetSongsByCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId; 
  try {
    console.log(categoryId);
    const songs = await db.MP3.find({ categoryId: categoryId }) 
      .select('_id name image')
      .lean();
      console.log(songs.name)
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh sách bài hát" });
  }
};
