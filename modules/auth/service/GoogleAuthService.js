const crypto=require('node:crypto');
const {UserModel}=require('../../../model/db_song');
const Security=require('../../account/model/AccountSecurity');
const AccountSecurity=require('../../account/service/AccountSecurityService');
const Password=require('./PasswordService');
const ApiError=require('../../../utils/ApiError');
const fail=(status,message)=>new ApiError({status,code:'GOOGLE_AUTH',message});
class GoogleAuthService {
 extractProfile(profile){
  const email=profile?.emails?.[0];
  if(typeof profile?.id!=='string'||!profile.id||typeof email?.value!=='string'||!(email.verified===true||profile._json?.email_verified===true||profile._json?.verified_email===true))throw fail(403,'Google chưa xác minh danh tính và email.');
  return {googleId:profile.id,gmail:email.value.trim().toLowerCase(),fullName:profile.displayName||'',avatar:profile.photos?.[0]?.value||''};
 }
 async authenticate(profile,context={}){
  if(context.verifiedOAuth!==true)throw fail(403,'Cần xác thực Google OAuth thực.');
  const google=this.extractProfile(profile);
  let linked=await Security.findOne({googleSubject:google.googleId,googleDisabled:{$ne:true}}).lean();
  let user=linked?await UserModel.findById(linked.userId):null;
  if(!user){
   const existing=await UserModel.findOne({gmail:google.gmail});
   if(existing){const security=await Security.findOne({userId:existing._id}).lean();
    if(existing.Authorization!=='GOOGLE'||security?.googleDisabled||security?.googleSubject&&security.googleSubject!==google.googleId)throw fail(403,'Đăng nhập tài khoản hiện tại rồi liên kết Google trong cài đặt.');
    user=existing;
   }else user=await require('../../../utils/permalinkService').createUser({userID:crypto.randomUUID(),nameAccount:google.gmail,namePassword:await Password.hash(crypto.randomBytes(32).toString('hex')),gmail:google.gmail,fullName:google.fullName,imageAccount:google.avatar,Authorization:'GOOGLE',role:1});
   // Previous bootstrap wrote the provider without coordinating an unlink.
   await AccountSecurity.linkGoogle(user,google,{bootstrap:true});
   linked=await Security.findOne({userId:user._id}).lean();
   user=await UserModel.findById(user._id);
  }
  // Preserve the verified binding generation across user reload and session creation.
  AccountSecurity.rememberGoogleIdentity(user,{subject:google.googleId,revision:linked.revision});
  return user;
 }
 async linkGoogleAccount(userId,profile,context={}){if(context.verifiedOAuth!==true)throw fail(403,'Cần xác thực Google OAuth thực.');const user=await UserModel.findById(userId);if(!user)throw fail(401,'Vui lòng đăng nhập lại.');if(context.authVersion!==undefined&&(user.authVersion||0)!==context.authVersion)throw fail(401,'Phiên liên kết Google đã thay đổi.');return AccountSecurity.linkGoogle(user,this.extractProfile(profile));}
}
module.exports=new GoogleAuthService();

// Previous email-matched implementation retained, unloaded.
// const crypto = require("crypto");
//
// const UserService = require("../../user/service/UserService");
// const UserRepository = require("../../user/repository/UserRepository");
//
// const ApiError = require("../../../utils/ApiError");
//
// const {
//     ErrorCode,
//     UserRole,
// } = require("../../../constants");
//
// class GoogleAuthService {
//
//     /**
//      * Xử lý đăng nhập Google
//      * Nếu User chưa tồn tại sẽ tự động tạo tài khoản
//      */
//     async authenticate(profile) {
//
//         const googleProfile = this.extractProfile(profile);
//
//         let user = await this.findGoogleUser(
//             googleProfile.gmail
//         );
//
//         if (!user) {
//
//             user = await this.createGoogleUser(
//                 googleProfile
//             );
//
//         } else {
//
//             user = await this.updateGoogleProfile(
//                 user,
//                 googleProfile
//             );
//
//         }
//
//         return user;
//
//     }
//
//     /**
//      * Lấy User theo Gmail
//      */
//     async findGoogleUser(gmail) {
//
//         return await UserRepository.findByGmail(gmail);
//
//     }
//
//     /**
//      * Tạo User mới từ Google
//      */
//     async createGoogleUser(profile) {
//
//         return await UserService.create({
//
//             userID: crypto.randomUUID(),
//
//             gmail: profile.gmail,
//
//             fullName: profile.fullName,
//
//             imageAccount: profile.avatar,
//
//             Authorization: "GOOGLE",
//
//             role: UserRole.USER,
//
//         });
//
//     }
//
//     /**
//      * Đồng bộ Avatar / FullName
//      */
//     async updateGoogleProfile(user, profile) {
//
//         let changed = false;
//
//         if (
//             profile.avatar &&
//             profile.avatar !== user.imageAccount
//         ) {
//
//             user.imageAccount = profile.avatar;
//
//             changed = true;
//
//         }
//
//         if (
//             profile.fullName &&
//             profile.fullName !== user.fullName
//         ) {
//
//             user.fullName = profile.fullName;
//
//             changed = true;
//
//         }
//
//         if (changed) {
//
//             await UserService.save(user);
//
//         }
//
//         return user;
//
//     }
//
//     /**
//      * Liên kết Google Account
//      */
//     async linkGoogleAccount(userId, profile) {
//
//         const user = await UserService.getById(userId);
//
//         if (!user) {
//
//             throw new ApiError(
//                 ErrorCode.USER_NOT_FOUND
//             );
//
//         }
//
//         const google = this.extractProfile(profile);
//
//         user.gmail = google.gmail;
//
//         user.Authorization = "GOOGLE";
//
//         user.imageAccount = google.avatar;
//
//         user.fullName = google.fullName;
//
//         await UserService.save(user);
//
//         return user;
//
//     }
//
//     /**
//      * Tách dữ liệu Google Profile
//      */
//     extractProfile(profile) {
//
//         if (!profile) {
//
//             throw new ApiError(
//                 ErrorCode.AUTH_UNAUTHORIZED
//             );
//
//         }
//
//         return {
//
//             googleId: profile.id,
//
//             gmail: profile.emails?.[0]?.value,
//
//             fullName: profile.displayName,
//
//             avatar: profile.photos?.[0]?.value,
//
//         };
//
//     }
//
// }
//
// module.exports = new GoogleAuthService();
