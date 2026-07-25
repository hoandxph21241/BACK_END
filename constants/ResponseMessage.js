const ResponseMessage = Object.freeze({
  // AUTH
  REGISTER_SUCCESS: "Register successfully.",
  LOGIN_SUCCESS: "Login successfully.",
  LOGOUT_SUCCESS: "Logout successfully.",
  REFRESH_TOKEN_SUCCESS: "Refresh token successfully.",
  PROFILE_SUCCESS: "Profile loaded successfully.",
  GOOGLE_LOGIN_SUCCESS: "Google login successfully.",
  PASSWORD_CHANGED: "Password changed successfully.",
  PASSWORD_RESET: "Password reset successfully.",
  // USER
  USER_CREATED: "User created successfully.",
  USER_UPDATED: "User updated successfully.",
  USER_DELETED: "User deleted successfully.",
  // SONG
  SONG_CREATED: "Song uploaded successfully.",
  SONG_UPDATED: "Song updated successfully.",
  SONG_DELETED: "Song deleted successfully.",
  SONG_LOADED: "Song loaded successfully.",
  SONG_LIST_LOADED: "Songs loaded successfully.",
  // CATEGORY
  CATEGORY_CREATED: "Category created successfully.",
  CATEGORY_UPDATED: "Category updated successfully.",
  CATEGORY_DELETED: "Category deleted successfully.",
  CATEGORY_LIST_LOADED: "Categories loaded successfully.",
  // PLAYLIST
  PLAYLIST_CREATED: "Playlist created successfully.",
  PLAYLIST_UPDATED: "Playlist updated successfully.",
  PLAYLIST_DELETED: "Playlist deleted successfully.",
  PLAYLIST_LOADED: "Playlist loaded successfully.",
});

module.exports = Object.freeze(ResponseMessage);
