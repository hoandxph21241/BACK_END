const { songPath } = require('../../../utils/permalink');
const { getUploadDate } = require('../../../utils/songResponse');

class SongMapper {

    //------------------------------------
    // Summary
    //------------------------------------

    static summary(song) {

        if (!song) {
            return null;
        }

        return {

            id: song._id,
            profileSlug: song.profileSlug || null,
            slug: song.slug || null,
            url: songPath(song),

            name: song.name,

            artist: song.artist,

            image: song.image,

            duration: song.duration,

        };

    }

    //------------------------------------
    // Detail
    //------------------------------------

    static detail(song) {

        if (!song) {
            return null;
        }

        return {

            id: song._id,
            profileSlug: song.profileSlug || null,
            slug: song.slug || null,
            url: songPath(song),

            userID: song.userID,

            name: song.name,

            artist: song.artist,

            image: song.image,

            category: song.categoryId,

            duration: song.duration,

            fileSize: song.fileSize,

            // Previous: uploadDate: song.uploadDate,
            uploadDate: getUploadDate(song),

        };

    }

    //------------------------------------
    // List
    //------------------------------------

    static list(songs) {

        if (!Array.isArray(songs)) {

            return [];

        }

        return songs.map(

            song => this.summary(song)

        );

    }

}

module.exports = SongMapper;
