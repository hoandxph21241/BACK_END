class BaseResponse {

    static item(data){

        return data;

    }

    static list(datas){

        return datas.map(

            item=>this.item(item)

        );

    }

}

module.exports=BaseResponse;