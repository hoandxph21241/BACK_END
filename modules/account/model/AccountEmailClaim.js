const {mongoose}=require('../../../model/db');
// A normalized verified address has one owner, even on standalone MongoDB.
const schema=new mongoose.Schema({_id:{type:String,required:true},owner:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},createdAt:{type:Date,default:Date.now}}, {collection:'AccountEmailClaim'});
module.exports=mongoose.models.AccountEmailClaim||mongoose.model('AccountEmailClaim',schema);
