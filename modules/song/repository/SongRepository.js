const BaseRepository =
    require("../../../common/repository/BaseRepository");

const { MP3 } =
    require("../../../model/db_song");

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
                        $options: "i",
                    },
                },

                {
                    artist: {
                        $regex: keyword,
                        $options: "i",
                    },
                },

            ],

        });

    }

    //------------------------------------
    // Category
    //------------------------------------

    async findByCategory(categoryId) {

        return this.model

            .find({
                categoryId,
            })

            .populate("categoryId");

    }

    //------------------------------------
    // Newest
    //------------------------------------

    async newest(

        filter = {},

        limit = 10,

    ) {

        return this.model

            .find(filter)

            .sort({

                uploadDate: -1,

            })

            .limit(limit);

    }

    //------------------------------------
    // Trending
    //------------------------------------

    async trending(

        filter = {},

        limit = 10,

    ) {

        return this.model

            .find(filter)

            .sort({

                playCount: -1,

            })

            .limit(limit);

    }

    //------------------------------------
    // Random
    //------------------------------------

    async random(

        filter = {},

        limit = 10,

    ) {

        const pipeline = [];

        if (
            filter &&
            Object.keys(filter).length > 0
        ) {

            pipeline.push({

                $match: filter,

            });

        }

        pipeline.push({

            $sample: {

                size: limit,

            },

        });

        return this.model.aggregate(
            pipeline
        );

    }

}

module.exports = new SongRepository();