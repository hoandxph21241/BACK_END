const Model = require('../model/db_song');

exports.getProfile = async (req, res) => {
  try {
    if (!req.session.userLogin) return res.redirect('/auth/signin');

    const { userID, _id } = req.session.userLogin;

    let user;

    if (_id) {
      user = await Model.UserModel.findById(_id).lean();
    } else if (userID) {
      user = await Model.UserModel.findOne({ userID }).lean();
    } else {
      return res.status(400).render('error', { message: 'Không có thông tin người dùng trong session' });
    }

    if (!user) {
      return res.status(404).render('error', { message: 'Không tìm thấy người dùng' });
    }
    res.render('user/profile.ejs', { user });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Lỗi máy chủ' });
  }
};

exports.getEditProfile = (req, res) => {
  if (!req.session.userLogin) return res.redirect('/auth/signin');
  res.render('profile_edit', { user: req.session.userLogin });
};

exports.postEditProfile = async (req, res) => {
  try {
    const { fullName, bio, grender } = req.body;
    const updatedUser = await Model.UserModel.findByIdAndUpdate(
      req.session.userLogin._id,
      { fullName, bio, grender },
      { new: true }
    );
    req.session.userLogin = updatedUser;
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi cập nhật hồ sơ");
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
