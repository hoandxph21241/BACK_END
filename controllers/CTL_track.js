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