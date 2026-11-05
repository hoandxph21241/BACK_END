const { mongoose } = require('../../../model/db');
const schema=new mongoose.Schema({
  owner:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},actor:{type:mongoose.Schema.Types.ObjectId,default:null},
  type:{type:String,enum:['follows','tracks','messages'],required:true},title:{type:String,required:true,maxlength:200},message:{type:String,maxlength:600},
  url:{type:String,maxlength:2048},dedupeKey:{type:String,required:true,maxlength:200},read:{type:Boolean,default:false},createdAt:{type:Date,default:Date.now},
},{collection:'AccountNotification'});
schema.index({owner:1,dedupeKey:1},{unique:true});
schema.index({createdAt:1},{expireAfterSeconds:90*86400});
module.exports=mongoose.models.AccountNotification||mongoose.model('AccountNotification',schema);
