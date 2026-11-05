const {mongoose}=require('../../../model/db');
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,required:true},type:{type:String,required:true},createdAt:{type:Date,default:Date.now}},
 {collection:'AccountAudit'});schema.index({userId:1,createdAt:-1,_id:-1});
module.exports=mongoose.models.AccountAudit||mongoose.model('AccountAudit',schema);
