var Model = require("../model/db_song");

async function createDefaultData() {
  const adminExists = await Model.UserModel.findOne({ role: 2 });
  if (!adminExists) {
    const defaultAdmin = new Model.UserModel({
      nameAccount: "admin@example.com",
      namePassword: "admin",
      userName: "Admin",
      fullName: "Admin",
      imageAccount: "Admin",
      gmail: "admin@example.com",
      grender: "Male",
      role: 2,
      locked: false,
    });
    await defaultAdmin.save();
    console.log("Admin_Data_Create");
  } else {
    console.log("Admin_No_Create");
  }

  const userExists = await Model.UserModel.findOne({ role: 1 });
  if (!userExists) {
    const defaultUser = new Model.UserModel({
      nameAccount: "user@example.com",
      namePassword: "user",
      userName: "User",
      fullName: "User",
      imageAccount: "User",
      gmail: "user@example.com",
      grender: "Male",
      role: 1,
      locked: false,
    });
    await defaultUser.save();
    console.log("User_Data_Create");
  } else {
    console.log("User_No_Create");
  }

  const categories = ["EDM", "VNH", "CHINA MIX", "NST"];

  for (let i = 0; i < categories.length; i++) {
    const categoryExists = await Model.CategoryModel.findOne({
      nameCategory: categories[i],
    });

    if (!categoryExists) {
      const defaultCategory = new Model.CategoryModel({
        nameCategory: categories[i],
        image: "",
      });
      await defaultCategory.save();
      console.log(`Category_${categories[i]}_Data_Create`);
    } else {
      console.log("Category_No_Create");
    }
  }


  // const category_Name_EDM = await Model.CategoryModel.findOne({
  //   nameCategory: "EDM",
  // });
  // if (!category_Name_EDM) {
  //   const defaultCategory = new Model.CategoryModel({
  //     nameCategory: "EDM",
  //     image: "",
  //   });
  //   await defaultCategory.save();
  //   console.log("Category_EDM_Data_Create");
  // } else {
  //   console.log("Category_No_Create");
  // }

  // const category_Name_VNH = await Model.CategoryModel.findOne({
  //   nameCategory: "VNH",
  // });
  // if (!category_Name_VNH) {
  //   const defaultCategory = new Model.CategoryModel({
  //     nameCategory: "VNH",
  //     image: "",
  //   });
  //   await defaultCategory.save();
  //   console.log("Category_VNH_Data_Create");
  // } else {
  //   console.log("Category_No_Create");
  // }

  // const category_Name_CHINA_MIX = await Model.CategoryModel.findOne({
  //   nameCategory: "CHINA MIX",
  // });
  // if (!category_Name_CHINA_MIX) {
  //   const defaultCategory = new Model.CategoryModel({
  //     nameCategory: "CHINA MIX",
  //     image: "",
  //   });
  //   await defaultCategory.save();
  //   console.log("Category_CHINA_MIX_Data_Create");
  // } else {
  //   console.log("Category_No_Create");
  // }

  // const category_Name_NST = await Model.CategoryModel.findOne({
  //   nameCategory: "NST",
  // });
  // if (!category_Name_NST) {
  //   const defaultCategory = new Model.CategoryModel({
  //     nameCategory: "NST",
  //     image: "",
  //   });
  //   await defaultCategory.save();
  //   console.log("Category_NST_Data_Create");
  // } else {
  //   console.log("Category_No_Create");
  // }

  console.log("Finished_Create");
}

createDefaultData().catch((error) => {
  console.error("Error:", error);
});

exports.yeu_cau_dang_nhap = (req, res, next) => {
  if (req.session.userLogin) {
    console.log("Đã Đăng Nhập");
    next();
  } else {
    console.log("Chưa Đăng Nhập");
    res.redirect("/auth/signin");
  }
};
