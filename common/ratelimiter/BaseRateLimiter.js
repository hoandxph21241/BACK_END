class BaseRateLimiter {

    constructor(windowMs,max){

        return rateLimit({

            windowMs,

            max,

            standardHeaders:true,

            legacyHeaders:false

        });

    }

}

module.exports=BaseRateLimiter;