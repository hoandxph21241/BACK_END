const { mongoose } = require('../../../model/db');
const schema = new mongoose.Schema({
  owner:{type:mongoose.Schema.Types.ObjectId,required:true,unique:true,index:true},
  notifications:{follows:{type:Boolean,default:true},tracks:{type:Boolean,default:true},messages:{type:Boolean,default:true},uploads:{type:Boolean,default:true}},
  privacy:{messages:{type:String,enum:['everyone','following','nobody'],default:'everyone'}},
  playback:{rememberSong:{type:Boolean,default:true},rememberVolume:{type:Boolean,default:true},autoNext:{type:Boolean,default:true},volume:{type:Number,min:0,max:1,default:1}},
  language:{type:String,enum:['vi','en'],default:'en'},
},{collection:'AccountPreferences',timestamps:true});
module.exports = mongoose.models.AccountPreferences || mongoose.model('AccountPreferences',schema);
