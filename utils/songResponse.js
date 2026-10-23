const { songPath } = require('./permalink');

function getCategoryId(category) {
  if (!category) return null;
  if (typeof category === "object") {
    return category._id?.toString() || category.toString();
  }
  return category.toString();
}

function getImageUrl(image) {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.url || image.display_url || image.thumb?.url || null;
}

function getUploadDate(song) {
  for (const value of [song?.uploadDate, song?.createdAt]) {
    if (!(value instanceof Date) && typeof value !== 'string') continue;
    if (typeof value === 'string' && !value.trim()) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function formatSongSummary(song) {
  if (!song) return null;

  const categoryId = getCategoryId(song.categoryId);
  const categoryName =
    song.categoryId && typeof song.categoryId === "object"
      ? song.categoryId.nameCategory || null
      : null;

  return {
    _id: song._id?.toString(),
    profileSlug: song.profileSlug || null,
    slug: song.slug || null,
    url: songPath(song),
    name: song.name || "",
    artist: song.artist || song.singer || null,
    image: getImageUrl(song.image),
    categoryId,
    category: categoryId
      ? {
          _id: categoryId,
          name: categoryName,
        }
      : null,
    duration: song.duration || null,
    fileSize: song.fileSize || null,
    // Previous: uploadDate: song.uploadDate || null,
    uploadDate: getUploadDate(song),
  };
}

function formatSongSummaries(songs) {
  return songs.map(formatSongSummary);
}

const SONG_SUMMARY_SELECT =
  // Previous: "name artist singer image categoryId duration fileSize uploadDate originalName";
  // Previous projection omitted createdAt, preventing fallback for existing uploads.
  "name artist singer image categoryId duration fileSize uploadDate createdAt originalName profileSlug slug";

module.exports = {
  SONG_SUMMARY_SELECT,
  getImageUrl,
  getUploadDate,
  formatSongSummary,
  formatSongSummaries,
};
