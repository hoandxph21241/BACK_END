const Notice=require('../model/AccountNotification');
const Preferences=require('./AccountPreferencesService');
const {UserModel}=require('../../../model/db_song');
const Follow=require('../../user/model/UserFollow');
const isId=value=>/^[a-f0-9]{24}$/i.test(String(value||''));
const local=value=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')?value.slice(0,2048):'/feed';
exports.publish=async ({owner,actor,type,title,message,url,dedupeKey})=>{
  if(!isId(owner)||actor&&(!isId(actor)||String(owner)===String(actor))||!['follows','tracks','messages'].includes(type))return;
  if(!(await Preferences.get(String(owner))).notifications[type])return;
  if(actor&&await require('./AccountPrivacyService').blocked(String(owner),String(actor)))return;
  await Notice.init();
  try{await Notice.updateOne({owner,dedupeKey:String(dedupeKey).slice(0,200)},{$setOnInsert:{owner,actor:actor||null,type,title:String(title||'MediaHz').slice(0,200),message:String(message||'').slice(0,600),url:local(url),dedupeKey:String(dedupeKey).slice(0,200)}},{upsert:true,runValidators:true});}
  catch(error){if(error.code!==11000)throw error;}
};
exports.list=async owner=>{
  const preferences=await Preferences.get(String(owner));
  const enabled=['follows','tracks','messages'].filter(type=>preferences.notifications[type]);
  const excluded=await require('./AccountPrivacyService').excluded(String(owner));
  const items=await Notice.find({owner,type:{$in:enabled},actor:{$nin:excluded}}).select('_id type title message url read createdAt').sort({createdAt:-1,_id:-1}).limit(50).lean();
  return {viewerId:String(owner),items:items.map(item=>({id:String(item._id),type:item.type,title:item.title,message:item.message,url:local(item.url),read:item.read===true,time:new Date(item.createdAt).getTime(),status:'success'}))};
};
exports.read=async owner=>{await Notice.updateMany({owner,read:false},{$set:{read:true}});return exports.list(owner);};
exports.clear=async owner=>{await Notice.deleteMany({owner});return {viewerId:String(owner),items:[]};};
exports.track=async song=>{
  if(song.isDeleted===true||song.isPublic===false||!song.userID)return;
  const creator=await UserModel.findOne({$or:[{userID:String(song.userID)},...(isId(song.userID)?[{_id:song.userID}]:[])]}).select('_id fullName userName').lean();
  if(!creator)return;
  const url=require('../../../utils/permalink').songPath(song)||'/feed';
  for await(const relation of Follow.find({followee:creator._id}).select('follower').lean().cursor()){
    await exports.publish({owner:relation.follower,actor:creator._id,type:'tracks',title:'New track',message:(creator.fullName||creator.userName||'MediaHz')+' · '+song.name,url,dedupeKey:'track:'+song._id});
  }
};
