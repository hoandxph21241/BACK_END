const ApiResponse = require("../../utils/ApiResponse");

class BaseController {

    constructor(service,response){

        this.service=service;

        this.response=response;

    }

    getAll=async(req,res)=>{

        const data=await this.service.getAll();

        ApiResponse.success(

            res,

            this.response.list(data)

        );

    }

    getById=async(req,res)=>{

        const data=await this.service.getById(

            req.params.id

        );

        ApiResponse.success(

            res,

            this.response.detail(data)

        );

    }

}