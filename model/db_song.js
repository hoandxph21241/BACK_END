var db = require("./db");
var userSchema = new db.mongoose.Schema(
  {
    userID: { type: String, required: true, unique: true, index: true },
    nameAccount: { type: String, required: true, unique: true, trim: true },
    namePassword: { type: String, required: true },
    imageAccount: { type: String, required: false },
    userName: { type: String, required: false },
    fullName: { type: String, required: false },
    gmail: { type: String, required: false, index: true, unique: false },
    Authorization: { type: String, required: false },
    // refreshToken: {
    //   type: String,
    //   default: "",
    // },
    refreshTokens: [
      {
        token: String,
        device: String,
        createdAt: Date,
        expiresAt: Date,
      },
    ],
    grender: { type: String, required: false },
    // Phân Quyền
    role: { type: Number, require: true, default: 1 },
    // OTP đổi mật khẩu
    otp: { type: String, require: false },
  },
  {
    collection: "User",
  },
);
let UserModel = db.mongoose.model("UserModel", userSchema);
// var mp3Schema = new db.mongoose.Schema(
//   {
//     name: String,
//     data: { type: Buffer },

//     // Bổ sung item
//     image: { type: String, require: false },
//     categoryId: { type: db.mongoose.Schema.Types.ObjectId, ref: "CategoryModel" },
//     userID:{type:String, require:false},

//   },
//   {
//     collection: "mp3",
//   }
// );
// let MP3 = db.mongoose.model("MP3", mp3Schema);

//v1.1
// const MP3Schema = new db.mongoose.Schema({
//   name: String,
//   artist: String,
//   data: { type: Buffer },
//   categoryId: { type: db.mongoose.Schema.Types.ObjectId, ref: "CategoryModel" },
//   userID: { type: String, require: false },
//   originalName: String,
//   fileSize: Number,
//   duration: Number,
//   uploadDate: {
//     type: Date,
//     default: Date.now,
//   },
//   image: {
//     url: String,
//     display_url: String,
//     delete_url: String,
//     thumb: {
//       filename: String,
//       name: String,
//       mime: String,
//       extension: String,
//       url: String,
//     },
//     originalName: String,
//   },
// });

var MP3Schema = new db.mongoose.Schema(
  {
    songID: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    artist: {
      type: String,
      required: false,
      default: "Unknown",
    },

    album: {
      type: String,
      required: false,
      default: "",
    },

    data: {
      type: Buffer,
    },

    categoryId: {
      type: db.mongoose.Schema.Types.ObjectId,
      ref: "CategoryModel",
      required: false,
    },

    userID: {
      type: String,
      required: false,
    },

    originalName: {
      type: String,
      required: false,
    },

    fileSize: {
      type: Number,
      required: false,
    },

    duration: {
      type: Number,
      required: false,
      default: 0,
    },

    image: {
      url: String,
      display_url: String,
      delete_url: String,

      thumb: {
        filename: String,
        name: String,
        mime: String,
        extension: String,
        url: String,
      },

      originalName: String,
    },

    playCount: {
      type: Number,
      default: 0,
    },

    likeCount: {
      type: Number,
      default: 0,
    },

    isPublic: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "MP3",
    timestamps: true,
  },
);

MP3Schema.index({
  name: "text",
  artist: "text",
});

MP3Schema.index({
  categoryId: 1,
});

MP3Schema.index({
  playCount: -1,
});

MP3Schema.index({
  createdAt: -1,
});

let MP3 = db.mongoose.model("MP3", MP3Schema);


// Bổ sung Table
var CategorySchema = new db.mongoose.Schema(
  {
    categoryID: { type: String, required: true },
    nameCategory: { type: String, require: false },
    image: { type: String, require: false },
    color: { type: String, require: false },
  },
  {
    collection: "Category",
  },
);
let CategoryModel = db.mongoose.model("CategoryModel", CategorySchema);

var PlayHistorySchema = new db.mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
    },

    songID: {
      type: db.mongoose.Schema.Types.ObjectId,
      ref: "MP3",
      required: true,
    },

    playedAt: {
      type: Date,
      default: Date.now,
    },

    songName: {
      type: String,
      required: true,
    },

    songImage: {
      type: String,
      required: false,
    },
  },
  {
    collection: "PlayHistory",
  },
);

PlayHistorySchema.index({
  userID: 1,
  playedAt: -1,
});

let PlayHistoryModel = db.mongoose.model("PlayHistoryModel", PlayHistorySchema);

module.exports = {
  UserModel,
  MP3,
  CategoryModel,
  PlayHistoryModel,
};
