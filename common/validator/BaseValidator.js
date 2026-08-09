const ApiError=require("../../utils/ApiError");

class BaseValidate{

    static required(value,error){

        if(

            value===undefined ||

            value===null ||

            value===""

        ){

            throw new ApiError(error);

        }
        return value;

    }

}

module.exports=BaseValidate;