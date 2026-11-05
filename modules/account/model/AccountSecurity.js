const {mongoose}=require('../../../model/db');
const twoFactor=new mongoose.Schema({enabled:{type:Boolean,default:false},secret:String,pendingSecret:String,pendingExpiresAt:Date,pendingAuthVersion:Number,pendingCredentialHash:String,pendingAttempts:{type:Number,default:0},lastCounter:Number,recoveryHashes:{type:[String],default:[]}},{_id:false});
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,required:true,unique:true},verifiedEmail:String,emailVerifiedAt:Date,
 googleSubject:{type:String,unique:true,sparse:true},googleEmail:String,googleDisabled:{type:Boolean,default:false},googleOnly:{type:Boolean,default:false},localPasswordEnabled:{type:Boolean,default:false},
 status:{type:String,enum:['active','deactivated','deletion-pending'],default:'active'},deletionRequestedAt:Date,
 mutationId:String,mutationUntil:Date,twoFactor:{type:twoFactor,default:()=>({})},factorWindow:Date,factorAttempts:{type:Number,default:0},revision:{type:Number,default:0}},
 {collection:'AccountSecurity',timestamps:true});
module.exports=mongoose.models.AccountSecurity||mongoose.model('AccountSecurity',schema);
