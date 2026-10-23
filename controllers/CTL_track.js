/* Previous ID-only page controller, retained for reference.
const Model = require("../model/db_song");
const Home = require("./CTL_home");
const { getImageUrl } = require("../utils/songResponse");
const FIELDS = "name artist album image categoryId duration fileSize uploadDate originalName playCount likeCount userID";
function imageUrl(image) {
  const value = getImageUrl(image);
  return typeof value === "string" && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value)) ? value : "/images/chibi.gif";
}
function shell(req, res, next) {
  res.locals.initialView = "/home/song/" + encodeURIComponent(req.params.id);
  return Home.Home(req, res, next);
}
exports.show = async (req, res, next) => {
  res.vary("X-Requested-With");
  try {
    const id = req.params.id;
    const song = /^[a-f0-9]{24}$/i.test(id)
      ? await Model.MP3.findById(id).select(FIELDS).populate("categoryId", "nameCategory").lean()
      : null;
    if (!song) {
      res.status(404);
      if (!req.xhr) return shell(req, res, next);
      return res.render("home/track_detail", { song: null });
    }
    if (!req.xhr) return shell(req, res, next);
    const related = song.categoryId?._id
      ? await Model.MP3.find({ categoryId: song.categoryId._id, _id: { $ne: song._id } })
        .select(FIELDS).sort({ playCount: -1, uploadDate: -1 }).limit(5).lean()
      : [];
    const uploader = song.userID
      ? await Model.UserModel.findOne({ userID: song.userID }).select("fullName userName imageAccount profileTag").lean()
      : null;
    return res.render("home/track_detail", { song, related, uploader, imageUrl });
  } catch (error) { next(error); }
};
*/

const Model = require('../model/db_song');
const Home = require('./CTL_home');
const { getImageUrl, getUploadDate } = require('../utils/songResponse');
const { songPath, validSlug, validProfileSlug } = require('../utils/permalink');
const permalinks = require('../utils/permalinkService');
// Previous projection selected uploadDate but not the timestamp used by existing songs.
const FIELDS = 'name artist album image categoryId duration fileSize uploadDate createdAt originalName playCount likeCount userID profileSlug slug';
const PUBLIC = { isDeleted: { $ne: true }, isPublic: { $ne: false } };

function imageUrl(image) {
  const value = getImageUrl(image);
  return typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value)) ? value : '/images/chibi.gif';
}

function shell(req, res, next, path) {
  res.locals.initialView = path;
  return Home.Home(req, res, next);
}

function missing(req, res, next) {
  res.status(404);
  return req.xhr ? res.render('home/track_detail', { song: null })
    : shell(req, res, next, req.originalUrl);
}

exports.show = async (req, res, next) => {
  res.vary('X-Requested-With');
  try {
    const id = req.params.id;
    const song = /^[a-f0-9]{24}$/i.test(id)
      ? await Model.MP3.findOne({ _id: id, ...PUBLIC }).select(FIELDS).lean() : null;
    if (!song) return missing(req, res, next);
    const canonical = songPath(await permalinks.ensureSongPermalink(song));
    const query = new URL(req.originalUrl, 'http://localhost').search;
    return res.redirect(301, canonical + query);
  } catch (error) { next(error); }
};

exports.showBySlug = async (req, res, next) => {
  const profileSlug = req.params.profileSlug.toLowerCase();
  const slug = req.params.songSlug.toLowerCase();
  if ((!validProfileSlug(profileSlug) && profileSlug !== 'mediahz') || !validSlug(slug)) return next();
  res.vary('X-Requested-With');
  try {
    const song = await Model.MP3.findOne({ profileSlug, slug, ...PUBLIC })
      .select(FIELDS).populate('categoryId', 'nameCategory').lean();
    if (!song) return missing(req, res, next);
    const canonical = songPath(song);
    const requestUrl = new URL(req.originalUrl, 'http://localhost');
    res.set('X-MediaHz-Canonical-Url', canonical);
    if (!req.xhr) {
      if (requestUrl.pathname !== canonical) return res.redirect(301, canonical + requestUrl.search);
      return shell(req, res, next, canonical + requestUrl.search);
    }
    const relatedSongs = song.categoryId?._id
      ? await Model.MP3.find({ categoryId: song.categoryId._id, _id: { $ne: song._id }, ...PUBLIC })
        .select(FIELDS).sort({ playCount: -1, uploadDate: -1 }).limit(5).lean() : [];
    const related = await Promise.all(relatedSongs.map(item => permalinks.ensureSongPermalink(item)));
    const uploader = song.userID ? await Model.UserModel.findOne({ userID: song.userID })
      .select('fullName userName imageAccount profileTag').lean() : null;
    // Previous: date rendering only had access to song.uploadDate.
    return res.render('home/track_detail', { song, related, uploader, imageUrl, songPath, getUploadDate });
  } catch (error) { next(error); }
};
