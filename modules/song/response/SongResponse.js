class SongResponse {

    static summary(song) {

        return {

            id: song._id,

            name: song.name,

            artist: song.artist,

            image: song.image,

            duration: song.duration,

        };

    }

    static detail(song) {

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

    static list(songs) {

        return songs.map(

            song => this.summary(song)

        );

    }

}

module.exports = SongResponse;