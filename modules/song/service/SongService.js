const SongRepository = require("../../repository/SongRepository");
const CategoryRepository = require("../../repository/CategoryRepository");

const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

class SongService {

    //------------------------------------
    // Create
    //------------------------------------

    async create(req) {

        const {
            name,
            artist,
            categoryId,
            userID,
            originalName,
            fileSize,
            duration,
            image,
            data,
        } = req.body;

        //------------------------------------
        // Validate
        //------------------------------------

        if (!name) {

            throw new ApiError(
                ErrorCode.SONG.NAME_REQUIRED
            );

        }

        if (!data) {

            throw new ApiError(
                ErrorCode.SONG.FILE_REQUIRED
            );

        }

        //------------------------------------
        // Check Category
        //------------------------------------

        if (categoryId) {

            const category =
                await CategoryRepository.findById(categoryId);

            if (!category) {

                throw new ApiError(
                    ErrorCode.CATEGORY.NOT_FOUND
                );

            }

        }

        //------------------------------------
        // Create
        //------------------------------------

        return await SongRepository.create({

            name,
            artist,
            categoryId,
            userID,
            originalName,
            fileSize,
            duration,
            image,
            data,
            uploadDate: new Date(),

        });

    }

    //------------------------------------
    // Get All
    //------------------------------------

    async getAll() {

        return await SongRepository.find();

    }

    //------------------------------------
    // Detail
    //------------------------------------

    async getById(req) {

        const { id } = req.params;

        const song =
            await SongRepository.findById(id);

        if (!song) {

            throw new ApiError(
                ErrorCode.SONG.NOT_FOUND
            );

        }

        return song;

    }

    //------------------------------------
    // Update
    //------------------------------------

    async update(req) {

        const { id } = req.params;

        const song =
            await SongRepository.update(
                id,
                req.body,
            );

        if (!song) {

            throw new ApiError(
                ErrorCode.SONG.NOT_FOUND
            );

        }

        return song;

    }

    //------------------------------------
    // Delete
    //------------------------------------

    async delete(req) {

        const { id } = req.params;

        const song =
            await SongRepository.delete(id);

        if (!song) {

            throw new ApiError(
                ErrorCode.SONG.NOT_FOUND
            );

        }

        return true;

    }

    //------------------------------------
    // Search
    //------------------------------------

    async search(req) {

        const keyword =
            req.query.keyword?.trim();

        if (!keyword) {

            return [];

        }

        return await SongRepository.search(
            keyword
        );

    }

    //------------------------------------
    // Category
    //------------------------------------

    async getByCategory(req) {

        const { categoryId } = req.params;

        const category =
            await CategoryRepository.findById(categoryId);

        if (!category) {

            throw new ApiError(
                ErrorCode.CATEGORY.NOT_FOUND
            );

        }

        return await SongRepository.findByCategory(
            categoryId
        );

    }

    //------------------------------------
    // New Release
    //------------------------------------

    async newest() {

        return await SongRepository.newest();

    }

    //------------------------------------
    // Trending
    //------------------------------------

    async trending() {

        return await SongRepository.trending();

    }

    //------------------------------------
    // Random
    //------------------------------------

    async random() {

        return await SongRepository.random();

    }

    //------------------------------------
    // Stream
    //------------------------------------

    async stream(req) {

        const { id } = req.params;

        const song =
            await SongRepository.findById(id);

        if (!song) {

            throw new ApiError(
                ErrorCode.SONG.NOT_FOUND
            );

        }

        return song;

    }

}

module.exports = new SongService();