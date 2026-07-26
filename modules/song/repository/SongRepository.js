const { BaseRepository } = require("../common");
const { MP3 } = require("../model/db_song");

class SongRepository extends BaseRepository {

    constructor() {
        super(MP3);
    }

    //------------------------------------
    // Search
    //------------------------------------

    async search(keyword) {

        return this.model.find({

            $or: [

                {
                    name: {
                        $regex: keyword,
                        $options: "i"
                    }
                },

                {
                    artist: {
                        $regex: keyword,
                        $options: "i"
                    }
                }

            ]

        });

    }

    //------------------------------------
    // Category
    //------------------------------------

    async findByCategory(categoryId) {

        return this.model

            .find({
                categoryId
            })

            .populate("categoryId");

    }

    //------------------------------------
    // Newest
    //------------------------------------

    async newest(limit = 10) {

        return this.model

            .find()

            .sort({
                uploadDate: -1
            })

            .limit(limit);

    }

    //------------------------------------
    // Trending
    //------------------------------------

    async trending(limit = 10) {

        return this.model

            .find()

            .sort({

                playCount: -1,

            })

            .limit(limit);

    }

    //------------------------------------
    // Random
    //------------------------------------

    async random(limit = 10) {

        return this.model.aggregate([

            {
                $sample: {
                    size: limit
                }
            }

        ]);

    }

}

module.exports = new SongRepository();