var db = require("../model/db_song");

// Thêm các hàm helper cho lịch sử phát nhạc
const addToPlayHistory = (req, songId, songName, songImage) => {
  if (!req.session.playHistory) {
    req.session.playHistory = [];
  }
  
  // Tạo object lịch sử
  const historyItem = {
    songId: songId,
    name: songName,
    image: songImage,
    playedAt: new Date(),
    playedAtRelative: 'Vừa xong'
  };
  
  // Loại bỏ bài hát cũ nếu đã tồn tại
  req.session.playHistory = req.session.playHistory.filter(item => item.songId !== songId);
  
  // Thêm vào đầu danh sách
  req.session.playHistory.unshift(historyItem);
  
  // Giới hạn số lượng (giữ 20 bài gần nhất)
  if (req.session.playHistory.length > 20) {
    req.session.playHistory = req.session.playHistory.slice(0, 20);
  }
};

const getPlayHistory = (req, limit = 4) => {
  if (!req.session.playHistory) {
    return [];
  }
  
  // Cập nhật thời gian tương đối
  const now = new Date();
  return req.session.playHistory.slice(0, limit).map(item => {
    const diff = now - new Date(item.playedAt);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    let playedAtRelative;
    if (minutes < 1) playedAtRelative = 'Vừa xong';
    else if (minutes < 60) playedAtRelative = `${minutes} phút trước`;
    else if (hours < 24) playedAtRelative = `${hours} giờ trước`;
    else if (days < 7) playedAtRelative = `${days} ngày trước`;
    else playedAtRelative = new Date(item.playedAt).toLocaleDateString('vi-VN');
    
    return {
      ...item,
      playedAtRelative
    };
  });
};

exports.Home = async (req, res, next) => {
  try {
    const mp3List = await db.MP3.find()
      .populate({
        path: "categoryId",
        select: "nameCategory",
      })
      .lean();

    // Lấy lịch sử phát nhạc
    const historySongs = getPlayHistory(req, 4);

    res.render("home/Home.ejs", { 
      mp3List: mp3List,
      historySongs: historySongs 
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching MP3 list" });
  }
};

exports.Home_pratical = async (req, res, next) => {
  try {
    const mp3List = await db.MP3.find()
      .populate({
        path: "categoryId",
        select: "nameCategory",
      })
      .lean();

    const historySongs = getPlayHistory(req, 4);

    res.render("home/Home_patical.ejs", { 
      mp3List: mp3List,
      historySongs: historySongs 
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching MP3 list" });
  }
};

exports.CT_Home = async (req, res, next) => {
  try {
    // Lấy tất cả MP3 với populate category và sắp xếp
    const mp3List = await db.MP3.find()
      .populate({
        path: "categoryId",
        select: "nameCategory",
      })
      .sort({ uploadDate: -1 })
      .lean();

    // Lấy danh sách categories
    const categories = await db.CategoryModel.find()
      .sort({ nameCategory: 1 })
      .lean();

    // Tạo object để group songs theo category
    const songsByCategory = {};
    
    // Khởi tạo categories với thuộc tính cần thiết
    categories.forEach(category => {
      songsByCategory[category._id.toString()] = {
        name: category.nameCategory,
        songs: [],
        _id: category._id
      };
    });

    // Phân loại bài hát theo category (giới hạn 5 bài/category)
    mp3List.forEach(song => {
      if (song.categoryId && song.categoryId._id) {
        const categoryId = song.categoryId._id.toString();
        if (songsByCategory[categoryId] && songsByCategory[categoryId].songs.length < 5) {
          songsByCategory[categoryId].songs.push(song);
        }
      }
    });

    // Loại bỏ categories không có bài hát
    Object.keys(songsByCategory).forEach(categoryId => {
      if (songsByCategory[categoryId].songs.length === 0) {
        delete songsByCategory[categoryId];
      }
    });

    // Tạo top rated songs (có thể thay đổi logic này)
    const topRatedSongs = mp3List.slice(0, 5);

    // Lấy thông tin user
    const user = req.session.userLogin || { fullName: 'Guest' };
    
    // Lấy lịch sử phát nhạc
    const historySongs = getPlayHistory(req, 4);

    // Render với tất cả dữ liệu cần thiết
    res.render("home/CT_Home.ejs", {
      mp3List,
      songsByCategory,
      topRatedSongs,
      categories,
      user,
      historySongs,
      // Thêm helper functions nếu cần
      helpers: {
        formatDate: (date) => new Date(date).toLocaleDateString(),
        truncateString: (str, length = 50) => str.length > length ? str.substring(0, length) + '...' : str
      }
    });

  } catch (err) {
    console.error("Error in CT_Home:", err);
    
    // Render với dữ liệu mặc định khi có lỗi
    res.status(500).render("home/CT_Home.ejs", {
      mp3List: [],
      songsByCategory: {},
      topRatedSongs: [],
      categories: [],
      user: { fullName: 'Guest' },
      historySongs: [],
      error: "Unable to load music library",
      helpers: {
        formatDate: (date) => new Date(date).toLocaleDateString(),
        truncateString: (str, length = 50) => str.length > length ? str.substring(0, length) + '...' : str
      }
    });
  }
};

exports.Home_NEW = async (req, res, next) => {
  try {
    const mp3List = await db.MP3.find()
      .select('-data -userID')
      .populate({
        path: "categoryId",
        select: "nameCategory _id",
      })
      .lean();

    const historySongs = getPlayHistory(req, 4);

    res.render("home/V_home.ejs", { 
      mp3List: mp3List,
      historySongs: historySongs 
    });
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
      .select('-userID')
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
    console.log(songs.name);
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh sách bài hát" });
  }
};


exports.PlaySong = async (req, res, next) => {
  try {
    const { songId } = req.body;
    
    if (!songId) {
      return res.status(400).json({ error: "Song ID is required" });
    }
    const song = await db.MP3.findById(songId)
      .select('name image')
      .lean();

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }
    addToPlayHistory(req, songId, song.name, song.image?.url || song.image?.display_url);

    res.json({ 
      success: true, 
      message: "Song added to play history",
      song: song
    });

  } catch (error) {
    console.error("Error in PlaySong:", error);
    res.status(500).json({ error: "Error adding to play history" });
  }
};

exports.GetPlayHistory = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 4;
    const historySongs = getPlayHistory(req, limit);
    
    res.json({ 
      success: true,
      historySongs: historySongs 
    });
  } catch (error) {
    console.error("Error in GetPlayHistory:", error);
    res.status(500).json({ 
      success: false,
      error: "Error getting play history",
      historySongs: []
    });
  }
};

exports.ClearPlayHistory = async (req, res, next) => {
  try {
    req.session.playHistory = [];
    res.json({ 
      success: true, 
      message: "Play history cleared" 
    });
  } catch (error) {
    console.error("Error in ClearPlayHistory:", error);
    res.status(500).json({ 
      success: false,
      error: "Error clearing play history" 
    });
  }
};

exports.RemoveFromHistory = async (req, res, next) => {
  try {
    const { songId } = req.params;
    
    if (!req.session.playHistory) {
      return res.json({ success: true, message: "No history to remove from" });
    }
    req.session.playHistory = req.session.playHistory.filter(item => item.songId !== songId);
    res.json({ 
      success: true, 
      message: "Song removed from history",
      historySongs: getPlayHistory(req, 4)
    });
  } catch (error) {
    console.error("Error in RemoveFromHistory:", error);
    res.status(500).json({ 
      success: false,
      error: "Error removing from history" 
    });
  }
};