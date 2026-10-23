const Model = require('../model/db_song');
const Home = require('./CTL_home');
const { SONG_SUMMARY_SELECT } = require('../utils/songResponse');
const { PAGE_SIZE, parseSearch, searchFilter, searchUrl } = require('../utils/songSearch');

exports.show = async (req, res, next) => {
  res.vary('X-Requested-With');
  try {
    const { q, page } = parseSearch(req.query);
    if (!req.xhr) {
      res.locals.initialView = searchUrl(q, page);
      return Home.Home(req, res, next);
    }
    let songs = [], total = 0;
    if (q) {
      const filter = searchFilter(q);
      total = await Model.MP3.countDocuments(filter).maxTimeMS(3000);
      songs = await Model.MP3.find(filter).select(SONG_SUMMARY_SELECT)
        .populate('categoryId', 'nameCategory').sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).maxTimeMS(3000).lean();
    }
    return res.render('home/search_results', { songs, q, page, total,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), searchUrl });
  } catch (error) { next(error); }
};
