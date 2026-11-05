const {mongoose}=require('../../../model/db');
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,required:true},bucket:{type:String,required:true},challengeId:String,purpose:String,action:String,
 email:String,sourceEmail:String,authVersion:Number,credentialHash:String,hash:String,expiresAt:Date,sentAt:Date,attempts:{type:Number,default:0},ready:Boolean,consumed:Boolean,
 windowStartedAt:Date,sendCount:{type:Number,default:0},deleteAt:Date},{collection:'AccountChallenge'});
schema.index({userId:1,bucket:1},{unique:true});schema.index({deleteAt:1},{expireAfterSeconds:0});
module.exports=mongoose.models.AccountChallenge||mongoose.model('AccountChallenge',schema);
