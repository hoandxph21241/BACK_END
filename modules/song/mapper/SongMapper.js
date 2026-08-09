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

            userID: song.userID,

            name: song.name,

            artist: song.artist,

            image: song.image,

            category: song.categoryId,

            duration: song.duration,

            fileSize: song.fileSize,

            uploadDate: song.uploadDate,

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