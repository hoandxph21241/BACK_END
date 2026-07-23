var db = require("../model/db_song");
const {
  SONG_SUMMARY_SELECT,
  formatSongSummary,
  formatSongSummaries,
} = require("../utils/songResponse");

// ThÃªm cÃ¡c hÃ m helper cho lá»‹ch sá»­ phÃ¡t nháº¡c
const addToPlayHistory = (req, songId, songName, songImage) => {
  if (!req.session.playHistory) {
    req.session.playHistory = [];
  }
  
  // Táº¡o object lá»‹ch sá»­
  const historyItem = {
    songId: songId,
    name: songName,
    image: songImage,
    playedAt: new Date(),
    playedAtRelative: 'Vá»«a xong'
  };
  
  // Loáº¡i bá» bÃ i hÃ¡t cÅ© náº¿u Ä‘Ã£ tá»“n táº¡i
  req.session.playHistory = req.session.playHistory.filter(item => item.songId !== songId);
  
  // ThÃªm vÃ o Ä‘áº§u danh sÃ¡ch
  req.session.playHistory.unshift(historyItem);
  
  // Giá»›i háº¡n sá»‘ lÆ°á»£ng (giá»¯ 20 bÃ i gáº§n nháº¥t)
  if (req.session.playHistory.length > 20) {
    req.session.playHistory = req.session.playHistory.slice(0, 20);
  }
};

const getPlayHistory = (req, limit = 4) => {
  if (!req.session.playHistory) {
    return [];
  }
  
  // Cáº­p nháº­t thá»i gian tÆ°Æ¡ng Ä‘á»‘i
  const now = new Date();
  return req.session.playHistory.slice(0, limit).map(item => {
    const diff = now - new Date(item.playedAt);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    let playedAtRelative;
    if (minutes < 1) playedAtRelative = 'Vá»«a xong';
    else if (minutes < 60) playedAtRelative = `${minutes} phÃºt trÆ°á»›c`;
    else if (hours < 24) playedAtRelative = `${hours} giá» trÆ°á»›c`;
    else if (days < 7) playedAtRelative = `${days} ngÃ y trÆ°á»›c`;
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

    // Láº¥y lá»‹ch sá»­ phÃ¡t nháº¡c
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
    // Láº¥y táº¥t cáº£ MP3 vá»›i populate category vÃ  sáº¯p xáº¿p
    const mp3List = await db.MP3.find()
      .populate({
        path: "categoryId",
        select: "nameCategory",
      })
      .sort({ uploadDate: -1 })
      .lean();

    // Láº¥y danh sÃ¡ch categories
    const categories = await db.CategoryModel.find()
      .sort({ nameCategory: 1 })
      .lean();

    // Táº¡o object Ä‘á»ƒ group songs theo category
    const songsByCategory = {};
    
    // Khá»Ÿi táº¡o categories vá»›i thuá»™c tÃ­nh cáº§n thiáº¿t
    categories.forEach(category => {
      songsByCategory[category._id.toString()] = {
        name: category.nameCategory,
        songs: [],
        _id: category._id
      };
    });

    // PhÃ¢n loáº¡i bÃ i hÃ¡t theo category (giá»›i háº¡n 5 bÃ i/category)
    mp3List.forEach(song => {
      if (song.categoryId && song.categoryId._id) {
        const categoryId = song.categoryId._id.toString();
        if (songsByCategory[categoryId] && songsByCategory[categoryId].songs.length < 5) {
          songsByCategory[categoryId].songs.push(song);
        }
      }
    });

    // Loáº¡i bá» categories khÃ´ng cÃ³ bÃ i hÃ¡t
    Object.keys(songsByCategory).forEach(categoryId => {
      if (songsByCategory[categoryId].songs.length === 0) {
        delete songsByCategory[categoryId];
      }
    });

    // Táº¡o top rated songs (cÃ³ thá»ƒ thay Ä‘á»•i logic nÃ y)
    const topRatedSongs = mp3List.slice(0, 5);

    // Láº¥y thÃ´ng tin user
    const user = req.session.userLogin || { fullName: 'Guest' };
    
    // Láº¥y lá»‹ch sá»­ phÃ¡t nháº¡c
    const historySongs = getPlayHistory(req, 4);

    // Render vá»›i táº¥t cáº£ dá»¯ liá»‡u cáº§n thiáº¿t
    res.render("home/CT_Home.ejs", {
      mp3List,
      songsByCategory,
      topRatedSongs,
      categories,
      user,
      historySongs,
      // ThÃªm helper functions náº¿u cáº§n
      helpers: {
        formatDate: (date) => new Date(date).toLocaleDateString(),
        truncateString: (str, length = 50) => str.length > length ? str.substring(0, length) + '...' : str
      }
    });

  } catch (err) {
    console.error("Error in CT_Home:", err);
    
    // Render vá»›i dá»¯ liá»‡u máº·c Ä‘á»‹nh khi cÃ³ lá»—i
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


exports.CT_Home_v2 = async (req, res, next) => {
  try {
    // Láº¥y táº¥t cáº£ MP3 vá»›i populate category vÃ  sáº¯p xáº¿p
    const mp3List = await db.MP3.find()
      .populate({
        path: "categoryId",
        select: "nameCategory",
      })
      .sort({ uploadDate: -1 })
      .lean();

    // Láº¥y danh sÃ¡ch categories
    const categories = await db.CategoryModel.find()
      .sort({ nameCategory: 1 })
      .lean();

    // Táº¡o object Ä‘á»ƒ group songs theo category
    const songsByCategory = {};
    
    // Khá»Ÿi táº¡o categories vá»›i thuá»™c tÃ­nh cáº§n thiáº¿t
    categories.forEach(category => {
      songsByCategory[category._id.toString()] = {
        name: category.nameCategory,
        songs: [],
        _id: category._id
      };
    });

    // PhÃ¢n loáº¡i bÃ i hÃ¡t theo category (giá»›i háº¡n 5 bÃ i/category)
    mp3List.forEach(song => {
      if (song.categoryId && song.categoryId._id) {
        const categoryId = song.categoryId._id.toString();
        if (songsByCategory[categoryId] && songsByCategory[categoryId].songs.length < 5) {
          songsByCategory[categoryId].songs.push(song);
        }
      }
    });

    // Loáº¡i bá» categories khÃ´ng cÃ³ bÃ i hÃ¡t
    Object.keys(songsByCategory).forEach(categoryId => {
      if (songsByCategory[categoryId].songs.length === 0) {
        delete songsByCategory[categoryId];
      }
    });

    // Táº¡o top rated songs (cÃ³ thá»ƒ thay Ä‘á»•i logic nÃ y)
    const topRatedSongs = mp3List.slice(0, 5);

    // Láº¥y thÃ´ng tin user
    const user = req.session.userLogin || { fullName: 'Guest' };
    
    // Láº¥y lá»‹ch sá»­ phÃ¡t nháº¡c
    const historySongs = getPlayHistory(req, 4);

    // Render vá»›i táº¥t cáº£ dá»¯ liá»‡u cáº§n thiáº¿t
    res.render("home/CT_Home_V2.ejs", {
      mp3List,
      songsByCategory,
      topRatedSongs,
      categories,
      user,
      historySongs,
      // ThÃªm helper functions náº¿u cáº§n
      helpers: {
        formatDate: (date) => new Date(date).toLocaleDateString(),
        truncateString: (str, length = 50) => str.length > length ? str.substring(0, length) + '...' : str
      }
    });

  } catch (err) {
    console.error("Error in CT_Home:", err);
    
    // Render vá»›i dá»¯ liá»‡u máº·c Ä‘á»‹nh khi cÃ³ lá»—i
    res.status(500).render("home/CT_Home_V2.ejs", {
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
    const mp3List = await db.MP3.find()
      .select(SONG_SUMMARY_SELECT)
      .populate({ path: "categoryId", select: "nameCategory" })
      .sort({ uploadDate: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    res.json(formatSongSummaries(mp3List));
  } catch (err) {
    res.status(500).json({ error: "Error fetching MP3 list" });
  }
};

exports.Find_ID = async (req, res, next) => {
  const id = req.params.id;
  try {
    // IMPORTANT: The media player calls this endpoint to play audio.
    // Do not use SONG_SUMMARY_SELECT here because it excludes the MP3 Buffer field `data`.
    const song = await db.MP3.findById(id)
      .select("name artist image categoryId duration data")
      .populate({ path: "categoryId", select: "nameCategory" })
      .lean();

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    console.log("Router Find_ID:", {
      name: song?.name,
      hasAudioData: Boolean(song?.data),
      image: song?.image?.url || 'No image',
    });

    const formattedSong = formatSongSummary(song);
    res.status(200).json({
      ...formattedSong,
      // The frontend expects `data` to be a base64 string for data:audio/mpeg playback.
      data: (() => {
        if (!song.data) return null;
        if (Buffer.isBuffer(song.data)) return song.data.toString("base64");
        if (song.data.buffer) return Buffer.from(song.data.buffer).toString("base64");
        if (Array.isArray(song.data.data)) return Buffer.from(song.data.data).toString("base64");
        if (typeof song.data === "string") return song.data;
        return null;
      })(),
    });
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
      .select(SONG_SUMMARY_SELECT)
      .populate({ path: "categoryId", select: "nameCategory" })
      .lean();
    console.log(songs.name);
    res.json(formatSongSummaries(songs));
  } catch (error) {
    res.status(500).json({ error: "Lá»—i khi láº¥y danh sÃ¡ch bÃ i hÃ¡t" });
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


