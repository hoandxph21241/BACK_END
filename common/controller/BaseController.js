const ApiResponse = require("../../utils/ApiResponse");

class BaseController {

    constructor(service, mapper) {

        this.service = service;

        this.mapper = mapper;

    }

    getAll = async (req, res) => {

        const data = await this.service.getAll();

        return ApiResponse.success(

            res,

            this.mapper.list(data)

        );

    };

    getById = async (req, res) => {

        const data = await this.service.getById(

            req.params.id

        );

        return ApiResponse.success(

            res,

            this.mapper.detail(data)

        );

    };

    create = async (req, res) => {

        const data = await this.service.create(

            req.body

        );

        return ApiResponse.success(

            res,

            this.mapper.detail(data)

        );

    };

    update = async (req, res) => {

        const data = await this.service.update(

            req.params.id,

            req.body

        );

        return ApiResponse.success(

            res,

            this.mapper.detail(data)

        );

    };

    delete = async (req, res) => {

        await this.service.delete(

            req.params.id

        );

        return ApiResponse.success(

            res,

            null

        );

    };

}

module.exports = BaseController;