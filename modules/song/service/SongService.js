const BaseService = require("../../common/BaseService");

const SongRepository = require("../../repository/SongRepository");
const CategoryRepository = require("../../repository/CategoryRepository");

const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

class SongService extends BaseService {

    constructor() {

        super(

            SongRepository,

            ErrorCode.SONG.NOT_FOUND,

        );

    }

    //------------------------------------
    // Upload Song
    //------------------------------------

    async upload(data) {

        if (!data.name) {

            throw new ApiError(
                ErrorCode.SONG.NAME_REQUIRED
            );

        }

        if (!data.data) {

            throw new ApiError(
                ErrorCode.SONG.FILE_REQUIRED
            );

        }

        if (data.categoryId) {

            const category =
                await CategoryRepository.findById(
                    data.categoryId
                );

            if (!category) {

                throw new ApiError(
                    ErrorCode.CATEGORY.NOT_FOUND
                );

            }

        }

        return this.create({

            ...data,

            uploadDate: new Date(),

        });

    }

    //------------------------------------
    // Search
    //------------------------------------

    async search(keyword) {

        if (!keyword?.trim()) {

            return [];

        }

        return this.repository.search(keyword);

    }

    //------------------------------------
    // Category
    //------------------------------------

    async getByCategory(categoryId) {

        const category =
            await CategoryRepository.findById(
                categoryId
            );

        if (!category) {

            throw new ApiError(
                ErrorCode.CATEGORY.NOT_FOUND
            );

        }

        return this.repository.findByCategory(
            categoryId
        );

    }

    //------------------------------------
    // New Release
    //------------------------------------

    async newest() {

        return this.repository.newest();

    }

    //------------------------------------
    // Trending
    //------------------------------------

    async trending() {

        return this.repository.trending();

    }

    //------------------------------------
    // Random
    //------------------------------------

    async random() {

        return this.repository.random();

    }

    //------------------------------------
    // Stream
    //------------------------------------

    async stream(id) {

        return this.getById(id);

    }

}

module.exports = new SongService();