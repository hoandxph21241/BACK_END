class BaseRepository {

    constructor(model) {

        this.model = model;

    }

    //------------------------------------
    // Create
    //------------------------------------

    async create(data) {

        return await this.model.create(data);

    }

    //------------------------------------
    // Find
    //------------------------------------

    async find(filter = {}, select = null) {

        let query = this.model.find(filter);

        if (select) {
            query = query.select(select);
        }

        return await query;

    }

    async findOne(filter = {}, select = null) {

        let query = this.model.findOne(filter);

        if (select) {
            query = query.select(select);
        }

        return await query;

    }

    async findById(id, select = null) {

        let query = this.model.findById(id);

        if (select) {
            query = query.select(select);
        }

        return await query;

    }

    //------------------------------------
    // Populate
    //------------------------------------

    async findWithPopulate(filter, populate, select = null) {

        let query = this.model.find(filter);

        if (select) {
            query = query.select(select);
        }

        return await query.populate(populate);

    }

    async findOneWithPopulate(filter, populate, select = null) {

        let query = this.model.findOne(filter);

        if (select) {
            query = query.select(select);
        }

        return await query.populate(populate);

    }

    async findByIdWithPopulate(id, populate, select = null) {

        let query = this.model.findById(id);

        if (select) {
            query = query.select(select);
        }

        return await query.populate(populate);

    }

    //------------------------------------
    // Update
    //------------------------------------

    async update(id, data) {

        return await this.model.findByIdAndUpdate(
            id,
            data,
            {
                new: true,
                runValidators: true,
            },
        );

    }

    //------------------------------------
    // Delete
    //------------------------------------

    async delete(id) {

        return await this.model.findByIdAndDelete(id);

    }

    //------------------------------------
    // Count
    //------------------------------------

    async count(filter = {}) {

        return await this.model.countDocuments(filter);

    }

    //------------------------------------
    // Exists
    //------------------------------------

    async exists(filter = {}) {

        return await this.model.exists(filter);

    }

    //------------------------------------
    // Pagination
    //------------------------------------

    async paginate(filter = {}, page = 1, limit = 10, sort = {}) {

        page = Number(page);
        limit = Number(limit);

        const skip = (page - 1) * limit;

        const items = await this.model
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await this.count(filter);

        return {

            items,

            pagination: {

                page,

                limit,

                total,

                totalPages: Math.ceil(total / limit),

            },

        };

    }

    //------------------------------------
    // Soft Delete
    //------------------------------------

    async softDelete(id) {

        return await this.update(id, {

            isDeleted: true,

        });

    }

    //------------------------------------
    // Restore
    //------------------------------------

    async restore(id) {

        return await this.update(id, {

            isDeleted: false,

        });

    }

    //------------------------------------
// Create Many
//------------------------------------

async createMany(datas) {

    return await this.model.insertMany(datas);

}
//------------------------------------
// Update Many
//------------------------------------

async updateMany(filter, data) {

    return await this.model.updateMany(
        filter,
        data,
    );

}
//------------------------------------
// Delete Many
//------------------------------------

async deleteMany(filter) {

    return await this.model.deleteMany(filter);

}
//------------------------------------
// Aggregate
//------------------------------------

async aggregate(pipeline) {

    return await this.model.aggregate(pipeline);

}

//------------------------------------
// Distinct
//------------------------------------

async distinct(field, filter = {}) {

    return await this.model.distinct(
        field,
        filter,
    );

}

//------------------------------------
// Lean
//------------------------------------

async findLean(filter = {}) {

    return await this.model
        .find(filter)
        .lean();

}

async findOneLean(filter = {}) {

    return await this.model
        .findOne(filter)
        .lean();

}

async findByIdLean(id) {

    return await this.model
        .findById(id)
        .lean();

}
}

module.exports = BaseRepository;