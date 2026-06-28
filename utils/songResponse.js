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

function formatSongSummary(song) {
  if (!song) return null;

  const categoryId = getCategoryId(song.categoryId);
  const categoryName =
    song.categoryId && typeof song.categoryId === "object"
      ? song.categoryId.nameCategory || null
      : null;

  return {
    _id: song._id?.toString(),
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
    uploadDate: song.uploadDate || null,
  };
}

function formatSongSummaries(songs) {
  return songs.map(formatSongSummary);
}

const SONG_SUMMARY_SELECT =
  "name artist singer image categoryId duration fileSize uploadDate originalName";

module.exports = {
  SONG_SUMMARY_SELECT,
  formatSongSummary,
  formatSongSummaries,
};
