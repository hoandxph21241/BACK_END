const Model = require('../model/db_song');

// exports.getProfile = async (req, res) => {
//   try {
//     if (!req.session.userLogin) return res.redirect('/auth/signin');
//
//     const { userID, _id } = req.session.userLogin;
//
//     let user;
//
//     if (_id) {
//       user = await Model.UserModel.findById(_id).lean();
//     } else if (userID) {
//       user = await Model.UserModel.findOne({ userID }).lean();
//     } else {
//       return res.status(400).render('error', { message: 'Không có thông tin người dùng trong session' });
//     }
//
//     if (!user) {
//       return res.status(404).render('error', { message: 'Không tìm thấy người dùng' });
//     }
//     res.render('user/profile.ejs', { user });
//   } catch (error) {
//     console.error(error);
//     res.status(500).render('error', { message: 'Lỗi máy chủ' });
//   }
// };
//
// exports.getEditProfile = (req, res) => {
//   if (!req.session.userLogin) return res.redirect('/auth/signin');
//   res.render('profile_edit', { user: req.session.userLogin });
// };
//
// exports.postEditProfile = async (req, res) => {
//   try {
//     const { fullName, bio, grender } = req.body;
//     const updatedUser = await Model.UserModel.findByIdAndUpdate(
//       req.session.userLogin._id,
//       { fullName, bio, grender },
//       { new: true }
//     );
//     req.session.userLogin = updatedUser;
//     res.redirect('/users/profile');
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Lỗi cập nhật hồ sơ");
//   }
// };
const { randomInt } = require('crypto');
// Previous: const { saveProfileImages, cleanup } = require('../utils/profileImages');
const { saveProfileImages, cleanup, cleanupReplacedImages } = require('../utils/profileImages');
async function loadUser(req) {
  const sessionUser = req.session.userLogin;
  if (!sessionUser) return null;
  if (sessionUser._id) return Model.UserModel.findById(sessionUser._id).lean();
  if (sessionUser.userID) return Model.UserModel.findOne({ userID: sessionUser.userID }).lean();
  return null;
}
async function ensureProfileTag(user) {
  if (user.profileTag) return user;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const updated = await Model.UserModel.findOneAndUpdate(
        { _id: user._id, $or: [{ profileTag: { $exists: false } }, { profileTag: null }, { profileTag: '' }] },
        { $set: { profileTag: `hz${randomInt(100, 1000000)}` } },
        { new: true, runValidators: true },
      ).lean();
      return updated || await Model.UserModel.findById(user._id).lean();
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  throw new Error('Không thể tạo biệt danh. Vui lòng thử lại.');
}
function publicProfile(user) {
  return { fullName: user.fullName || '', imageAccount: user.imageAccount || '', bannerImage: user.bannerImage || '', profileTag: user.profileTag || '', bio: user.bio || '' };
}
function sessionProfile(user) {
  const fields = ['_id', 'userID', 'nameAccount', 'fullName', 'imageAccount',
    'bannerImage', 'profileTag', 'bio', 'gmail', 'grender', 'role', 'userName'];
  return Object.fromEntries(fields.filter(key => user[key] !== undefined).map(key => [key, user[key]]));
}
async function renderProfile(req, res, editOpen = false, message = '', status = 200) {
  try {
    let user = await loadUser(req);
    if (!user) return res.redirect('/auth/signin');
    user = await ensureProfileTag(user);
    // Previous: req.session.userLogin = { ...req.session.userLogin, ...user };
    req.session.userLogin = sessionProfile(user);
    return res.status(status).render('user/profile.ejs', { user, editOpen, message });
  } catch (error) {
    console.error('Cannot load profile:', error.message);
    return res.status(500).send('Không thể tải hồ sơ.');
  }
}
exports.getProfile = (req, res) => renderProfile(req, res);
exports.getEditProfile = (req, res) => renderProfile(req, res, true);
exports.postEditProfile = async (req, res) => {
  // Previous: let newPaths = [];
  let newFileIds = [];
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập lại.' });
    if (req.profileUploadError) throw new Error(req.profileUploadError);
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';
    const profileTag = typeof req.body.profileTag === 'string' ? req.body.profileTag.trim().toLowerCase().replace(/^#/, '') : '';
    if (!fullName || fullName.length > 80) throw new Error('Họ tên cần từ 1 đến 80 ký tự.');
    if (!/^hz\d{3,12}$/.test(profileTag)) throw new Error('Biệt danh có dạng #hz231: hz và từ 3 đến 12 chữ số.');
    if (bio.length > 500) throw new Error('Giới thiệu tối đa 500 ký tự.');
    // Previous: const images = await saveProfileImages(req.files);
    const images = await saveProfileImages(req.files, user._id);
    // Previous: newPaths = images.paths;
    newFileIds = images.fileIds;
    const updatedUser = await Model.UserModel.findByIdAndUpdate(user._id, {
      $set: { fullName, bio, profileTag, ...images.changes },
    }, { new: true, runValidators: true });
    if (!updatedUser) throw new Error('Không tìm thấy tài khoản.');
    // The DB now owns these uploads; a session-store failure must not remove them.
    // Previous: newPaths = [];
    newFileIds = [];
    await cleanupReplacedImages(user, images.changes);
    // Previous: req.session.userLogin = typeof updatedUser.toObject === 'function' ? updatedUser.toObject() : updatedUser;
    req.session.userLogin = sessionProfile(updatedUser);
    if (req.session.save) await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    if (req.xhr) return res.json({ success: true, user: publicProfile(updatedUser) });
    return res.redirect('/users/profile');
  } catch (error) {
    // Previous: await cleanup(newPaths);
    await cleanup(newFileIds);
    const message = error.code === 11000 ? 'Biệt danh này đã được sử dụng. Hãy chọn mã khác.' : error.message;
    if (req.xhr) return res.status(400).json({ success: false, message });
    return renderProfile(req, res, true, message, 400);
  }
};
exports.getLikes = async (req, res) => {
  try {
    if (!req.session.userLogin) return res.redirect('/auth/signin');
    const user = req.session.userLogin;
    res.render('user/likes.ejs', { user });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Lỗi tải danh sách yêu thích' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    if (!req.session.userLogin) return res.redirect('/auth/signin');
    const user = req.session.userLogin;
    res.render('user/settings.ejs', { user });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Lỗi tải cài đặt' });
  }
};
