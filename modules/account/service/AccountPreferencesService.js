const Joi = require('joi');
const Preferences = require('../model/AccountPreferences');
const { UserModel } = require('../../../model/db_song');
const defaults = () => ({notifications:{follows:true,tracks:true,messages:true,uploads:true},privacy:{messages:'everyone'},playback:{rememberSong:true,rememberVolume:true,autoNext:true,volume:1},language:'en'});
const group = fields => Joi.object(fields).min(1).unknown(false);
const bool = () => Joi.boolean().strict();
const input = group({
  notifications:group({follows:bool(),tracks:bool(),messages:bool(),uploads:bool()}),
  privacy:group({messages:Joi.string().valid('everyone','following','nobody')}),
  playback:group({rememberSong:bool(),rememberVolume:bool(),autoNext:bool(),volume:Joi.number().min(0).max(1)}),
  language:Joi.string().valid('vi','en'),
}).required();
const validId = id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
const failure = (status,message) => Object.assign(new Error(message),{status});
exports.defaults = defaults;
exports.get = async owner => {
  if (!validId(String(owner))) throw failure(400,'Invalid account.');
  const [stored,user] = await Promise.all([
    Preferences.findOne({owner}).select('notifications privacy playback language -_id').lean(),
    UserModel.findById(owner).select('rememberSongEnabled').lean(),
  ]);
  if(!user)throw failure(404,'Account not found.');
  const result = defaults();
  for(const key of ['notifications','privacy','playback']) Object.assign(result[key],stored?.[key]);
  if(stored?.language)result.language=stored.language;
  // The User flag is authoritative for reads and the atomic player-write guard.
  // Previous: a second copy in Preferences could disagree after concurrent off/on writes.
  result.playback.rememberSong=user.rememberSongEnabled!==false;
  return result;
};
exports.patch = async (owner,body) => {
  const {error,value} = input.validate(body,{convert:false,abortEarly:false});
  if(error)throw failure(400,'Invalid settings. Please check the selected values.');
  const set = {};
  for(const [key,part]of Object.entries(value)){
    if(key==='language')set.language=part;
    else for(const [leaf,val]of Object.entries(part)){
      // Previous: also write playback.rememberSong into this separate document.
      if(key==='playback'&&leaf==='rememberSong')continue;
      set[key+'.'+leaf]=val;
    }
  }
  // The same User record guards late player writes atomically when memory is disabled.
  if(value.playback?.rememberSong !== undefined){
    const update={rememberSongEnabled:value.playback.rememberSong};
    if(!value.playback.rememberSong)update.currentSongId=null;
    await UserModel.updateOne({_id:owner},{$set:update});
  }
  if(!Object.keys(set).length)return exports.get(owner);
  await Preferences.init();
  try{await Preferences.updateOne({owner},{$set:set,$setOnInsert:{owner}},{upsert:true,runValidators:true,setDefaultsOnInsert:true});}
  catch(error){if(error.code!==11000)throw error;await Preferences.updateOne({owner},{$set:set},{runValidators:true});}
  return exports.get(owner);
};
