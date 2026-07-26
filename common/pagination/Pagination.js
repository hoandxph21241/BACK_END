class Pagination{

    static build({

        page,

        limit,

        total

    }){

        return{

            page,

            limit,

            total,

            totalPages:Math.ceil(

                total/limit

            )

        };

    }

}

module.exports=Pagination;