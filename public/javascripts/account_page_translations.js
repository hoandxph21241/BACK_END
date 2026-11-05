/* Page interface extension for account_language.js; mount immediately after it.
 * Only explicit UI selectors and enumerated controller strings are translated.
 * Names, bios, genres, dates, values, server messages and the player stay owned
 * by their controllers. Preference loading/saving belongs to the runtime.
 */
(function () {
  'use strict';
  const language = window.MediaHzLanguage;
  if (!language || window.MediaHzPageTranslations) return;
  const pairs = {
    refresh: ['Làm mới', 'Refresh'], retry: ['Thử lại', 'Try again'],
    genre: ['Thể loại', 'Genre'], allGenres: ['Tất cả thể loại', 'All genres'],
    sort: ['Sắp xếp', 'Sort by'], newest: ['Mới nhất', 'Newest tracks'],
    newestFirst: ['Mới nhất trước', 'Newest first'], mostPlayed: ['Nghe nhiều nhất', 'Most played'],
    titleAZ: ['Tên bài hát A–Z', 'Title A–Z'], artistAZ: ['Nghệ sĩ A–Z', 'Artist A–Z'], nameAZ: ['Tên A–Z', 'Name A–Z'],
    signIn: ['Đăng nhập', 'Sign in'], more: ['Xem thêm', 'Load more'],
    follow: ['Theo dõi', 'Follow'], following: ['Đang theo dõi', 'Following'], message: ['Nhắn tin', 'Message'],
    nextUp: ['Tiếp theo', 'Next Up'], like: ['Yêu thích', 'Like'], unlike: ['Bỏ yêu thích', 'Unlike'],
    play: ['Phát bài hát', 'Play track'], pause: ['Tạm dừng', 'Pause'],
    playing: ['Đang phát', 'Playing'], paused: ['Đã tạm dừng', 'Paused'],
    loading: ['Đang tải…', 'Loading…'], playError: ['Không thể phát', 'Unable to play'],
    tagline: ['MediaHz · Âm nhạc kết nối chúng ta', 'MediaHz · Music connects us'],
    tracks: ['Bài hát', 'Tracks'], followers: ['Người theo dõi', 'Followers'],
    plays: ['Lượt nghe', 'Plays'], likes: ['Lượt thích', 'Likes'],
    discover: ['Khám phá âm nhạc', 'Discover music'],
    homeEyebrow: ['MEDIAHZ / KHÁM PHÁ', 'MEDIAHZ / DISCOVER'], homeRefresh: ['Làm mới trang khám phá', 'Refresh Home'],
    homeIntro: ['Âm thanh mới. Cảm hứng mới.', 'New sounds. Fresh inspiration.'],
    homeChanged: ['Gợi ý đã thay đổi. Làm mới trang khám phá', 'Your recommendations have changed. Refresh Home'],
    homeLoading: ['Đang tải nhạc…', 'Loading music…'], homeRefreshing: ['Đang làm mới trang khám phá…', 'Refreshing Home…'],
    noTracks: ['Không tìm thấy bài hát', 'No tracks found'],
    homeEmpty: ['Thử thể loại khác hoặc quay lại sau để khám phá nhạc mới.', 'Try another genre or come back later to discover new music.'],
    homeSidebar: ['Gợi ý người đăng và lịch sử nghe', 'Suggested creators and listening history'],
    creators: ['Người đăng nên theo dõi', 'Creators to follow'], creatorsNote: ['Tìm thêm âm nhạc bạn yêu thích', 'Find more sounds you love'],
    creatorsEmpty: ['Hiện chưa có gợi ý người đăng mới.', 'No new creator suggestions right now.'],
    history: ['Lịch sử nghe', 'Listening history'],
    recentEmpty: ['Những bài hát bạn vừa nghe sẽ xuất hiện tại đây.', 'Your recently played tracks will appear here.'],
    recentRefresh: ['Những bài hát vừa nghe sẽ xuất hiện khi bạn làm mới trang khám phá.', 'Your recently played tracks will appear here when you refresh Home.'],
    recentGuest: ['Đăng nhập để lưu lịch sử nghe.', 'Sign in to save your listening history.'],
    viewAll: ['Xem tất cả', 'View all'], less: ['Thu gọn', 'Show less'],
    forYou: ['Thêm nhạc hợp gu bạn', 'More of what you like'], forYouCopy: ['Dựa trên thể loại bạn thích và người bạn theo dõi', 'Based on genres you like and creators you follow'],
    releases: ['Bản phát hành mới', 'New releases'], releasesCopy: ['Âm thanh mới trên MediaHz', 'Fresh sounds on MediaHz'],
    popular: ['Bài hát nổi bật', 'Popular tracks'], popularCopy: ['Được cộng đồng nghe nhiều nhất', 'Most played by the community'], exploreGenre: ['Khám phá thể loại này', 'Explore this genre'],
    feed: ['Bảng tin', 'Feed'], community: ['MEDIAHZ / CỘNG ĐỒNG', 'MEDIAHZ / COMMUNITY'],
    feedRefresh: ['Làm mới bảng tin', 'Refresh Feed', 'Làm mới Feed'], feedTabs: ['Dòng bài hát', 'Track feed'],
    explore: ['Khám phá', 'Discover'], feedNewest: ['Mới nhất', 'Newest'], feedPopular: ['Nghe nhiều', 'Popular'],
    feedChanged: ['Danh sách theo dõi đã thay đổi. Cập nhật bảng tin', 'Your following list has changed. Refresh Feed', 'Danh sách theo dõi đã thay đổi. Cập nhật Feed'],
    feedEnd: ['Bạn đã xem hết các bài hát.', 'You have reached the end of the tracks.'],
    featuredCreators: ['Người đăng nổi bật', 'Featured creators'], exploreMore: ['Khám phá thêm âm nhạc', 'Discover more music'],
    findingCreators: ['Đang tìm người đăng…', 'Finding creators…'],
    feedCreatorsEmpty: ['Bạn đã theo dõi những người đăng nổi bật. Hãy khám phá thêm trong Feed.', 'You already follow the featured creators. Explore more in your Feed.'],
    feedCreatorsError: ['Chưa tải được người đăng.', 'Unable to load creators.'],
    feedLoading: ['Đang cập nhật Feed…', 'Refreshing Feed…'], feedLoadingMore: ['Đang tải thêm bài hát…', 'Loading more tracks…'],
    feedGuestTitle: ['Âm nhạc từ người bạn theo dõi', 'Music from people you follow'], feedGuestCopy: ['Đăng nhập để nghe những bài hát mới từ người bạn yêu thích.', 'Sign in to hear new tracks from people you love.'],
    feedNoNew: ['Chưa có bài hát mới', 'No new tracks yet'], feedNoTracks: ['Chưa có bài hát', 'No tracks yet'],
    feedNoGenre: ['Chưa có bài thuộc thể loại này từ người bạn theo dõi.', 'No tracks in this genre from people you follow yet.'],
    feedFollowCopy: ['Theo dõi người đăng để các bản nhạc mới xuất hiện tại đây.', 'Follow creators to see their new tracks here.'], feedEmptyCopy: ['Thử một thể loại khác hoặc làm mới Feed.', 'Try another genre or refresh Feed.'],
    noWaveform: ['Waveform chưa có sẵn', 'Waveform unavailable'],
    library: ['Thư viện', 'Library'], collection: ['MEDIAHZ / BỘ SƯU TẬP CỦA BẠN', 'MEDIAHZ / YOUR COLLECTION'],
    libraryIntro: ['Nhạc bạn thích. Người bạn theo dõi. Những lần lắng nghe.', 'Your favourites. Your people. Your listening.'], libraryRefresh: ['Làm mới thư viện', 'Refresh Library'], yourLibrary: ['Thư viện của bạn', 'Your Library'],
    likedTracks: ['Bài hát yêu thích', 'Liked tracks'], searchLibrary: ['Tìm trong thư viện', 'Search your Library'],
    searchLikes: ['Tìm bài hát yêu thích', 'Search liked tracks'], searchHistory: ['Tìm trong lịch sử nghe', 'Search your history'], searchFollowing: ['Tìm người bạn theo dõi', 'Search people you follow'],
    recentlyPlayed: ['Nghe gần đây', 'Recently played'], recentlyFollowed: ['Theo dõi gần đây', 'Recently followed'],
    libraryChanged: ['Đã lưu thay đổi. Làm mới để cập nhật danh sách.', 'Changes saved. Refresh to update this list.'],
    libraryLoading: ['Đang tải bộ sưu tập…', 'Loading your collection…'], libraryRefreshing: ['Đang làm mới bộ sưu tập…', 'Refreshing your collection…'], loadingMore: ['Đang tải thêm…', 'Loading more…'],
    libraryGuest: ['Âm nhạc của bạn bắt đầu tại đây', 'Your music starts here'], libraryGuestCopy: ['Đăng nhập để xem bài hát yêu thích, lịch sử nghe và người bạn theo dõi.', 'Sign in to find your liked tracks, listening history and the people you follow.'],
    exploreMusic: ['Khám phá âm nhạc', 'Explore music'], libraryTools: ['Công cụ thư viện', 'Library tools'], makeYours: ['Dành riêng cho bạn', 'Make it yours'], quickAccess: ['Truy cập nhanh', 'Quick access'],
    discoverNew: ['Khám phá nhạc mới ', 'Discover new music '], yourFeed: ['Bảng tin của bạn ', 'Your Feed '], yourProfile: ['Hồ sơ của bạn ', 'Your profile '],
    libraryHelpLikes: ['Giữ những bài hát bạn yêu thích bên mình. Nhấn trái tim trên bài hát để lưu tại đây.', 'Keep the tracks you love close. Use the heart on any track to save it here.'],
    libraryHelpHistory: ['Nghe lại âm thanh quen thuộc. Lịch sử được lưu vào tài khoản sau một lần nghe đủ lâu; làm mới để xem bài mới nhất.', 'Pick up a familiar sound. History is saved to your account after a qualified listen; refresh to see the latest tracks.'],
    libraryHelpFollowing: ['Kết nối với người đăng bạn theo dõi. Nhắn tin hoặc cập nhật trạng thái theo dõi tại đây.', 'Keep in touch with creators you follow. Start a message or update your follow status here.'],
    noLikes: ['Chưa có bài hát yêu thích', 'No liked tracks yet'], noLikesCopy: ['Nhấn trái tim trên bài hát để lưu vào thư viện.', 'Use the heart on any track to save it to your Library.'],
    noHistory: ['Lịch sử bắt đầu từ một lần nghe', 'Your history starts with a listen'], noHistoryCopy: ['Bài hát sẽ xuất hiện tại đây sau khi bạn nghe một lúc.', 'Tracks will appear here after you listen for a little while.'],
    noFollowing: ['Tìm người cùng gu', 'Find your people'], noFollowingCopy: ['Theo dõi người đăng từ trang khám phá, bảng tin hoặc trang bài hát để tìm họ tại đây.', 'Follow creators from Home, Feed or a track page to find them here.'],
    noMatches: ['Không có kết quả trong bộ sưu tập này', 'No matches in this collection'], noMatchesCopy: ['Thử từ khóa hoặc thể loại khác.', 'Try a different search or genre.'],
    profileEyebrow: ['HỒ SƠ MEDIAHZ', 'MEDIAHZ PROFILE'], copyLink: ['Sao chép liên kết', 'Copy link'], profileLink: ['Liên kết hồ sơ', 'Profile link'],
    editProfile: ['Sửa hồ sơ', 'Edit Profile'], about: ['Giới thiệu', 'About'], aboutName: ['Giới thiệu về ', 'About '],
    profileTabs: ['Các mục hồ sơ', 'Profile sections'], searchTracks: ['Tìm bài hát', 'Search tracks'], refreshTracks: ['Làm mới bài hát', 'Refresh tracks'],
    noMatchingTracks: ['Không có bài hát phù hợp', 'No matching tracks'], noPublicTracks: ['Chưa có bài hát công khai', 'No public tracks yet'], trySearch: ['Thử tên bài hát hoặc nghệ sĩ khác.', 'Try a different title or artist.'],
    firstTrack: ['Chia sẻ bài hát đầu tiên khi bạn sẵn sàng.', 'Share your first track when you are ready.'], creatorUploads: ['Bài hát mới của người đăng sẽ xuất hiện tại đây.', 'New uploads from this creator will appear here.'],
    uploadTrack: ['Tải một bài hát lên', 'Upload a track'], web: ['Trên mạng', 'On the web'], noLinks: ['Chưa thêm liên kết.', 'No links added yet.'],
    profileInfo: ['Thông tin hồ sơ', 'Profile information'], readMore: ['Đọc thêm', 'Read more'], publicTracks: ['Bài hát công khai', 'Public tracks'], yourSpace: ['Không gian của bạn', 'Your space'],
    openLibrary: ['Mở thư viện ', 'Open Library '], uploadMusic: ['Tải nhạc lên ', 'Upload music '], accountSettings: ['Cài đặt tài khoản ', 'Account settings '],
    profileLoading: ['Đang tải hồ sơ…', 'Loading profile…'], refreshingTracks: ['Đang làm mới bài hát…', 'Refreshing tracks…'],
    missingProfile: ['Không tìm thấy hồ sơ', 'Profile not found'], missingProfileCopy: ['Hồ sơ không khả dụng hoặc liên kết đã thay đổi.', 'This profile is unavailable or its link has changed.'],
    banner: ['Ảnh banner', 'Banner image'], avatar: ['Ảnh đại diện', 'Profile picture'], updateBanner: ['Đổi banner', 'Update banner'], updateImage: ['Đổi ảnh', 'Update image'], adjustBanner: ['Điều chỉnh banner', 'Adjust banner'], adjustAvatar: ['Điều chỉnh ảnh đại diện', 'Adjust profile picture'],
    imageHint: ['JPG, PNG hoặc WebP · Tối đa 5 MB mỗi ảnh', 'JPG, PNG or WebP · Up to 5 MB per image'],
    displayName: ['Tên hiển thị ', 'Display name '], profileTag: ['Biệt danh ', 'Profile tag '], firstName: ['Tên', 'First name'], lastName: ['Họ', 'Last name'], city: ['Thành phố', 'City'], country: ['Quốc gia', 'Country'], bio: ['Giới thiệu', 'Bio'], tagHint: ['hz và từ 3 đến 12 chữ số, ví dụ #hz231', 'hz followed by 3 to 12 digits, e.g. #hz231'],
    yourLinks: ['Liên kết của bạn', 'Your links'], addLink: ['Thêm liên kết', 'Add link'], linkTitle: ['Tên liên kết', 'Link title'], removeLink: ['Xóa liên kết', 'Remove link'],
    cancel: ['Hủy', 'Cancel'], close: ['Đóng', 'Close'], saveChanges: ['Lưu thay đổi', 'Save changes'], saving: ['Đang lưu…', 'Saving...', 'Saving…'],
    adjustImage: ['Điều chỉnh ảnh', 'Adjust image'], imagePosition: ['Vị trí ảnh', 'Image position'], centerImage: ['Căn giữa ảnh', 'Center image'], apply: ['Áp dụng', 'Apply'], closeEditor: ['Đóng trình sửa ảnh', 'Close image editor'], imageLoading: ['Đang tải ảnh…', 'Loading image...'],
    trackInfo: ['Thông tin bài hát', 'Track information'], artist: ['Nghệ sĩ ', 'Artist '], album: ['Album', 'Album'], uploadDate: ['Ngày tải lên', 'Upload date'], originalFile: ['Tệp gốc', 'Original file'], fileSize: ['Dung lượng', 'File size'],
    playSuffix: [' lượt nghe', ' plays'], likeSuffix: [' lượt thích', ' likes'], share: ['Chia sẻ', 'Share'],
    seekWaveform: ['Tua trên waveform', 'Seek on waveform'], waveformLoading: ['Đang tạo waveform...', 'Generating waveform...'], waveformError: ['Không thể tải waveform.', 'Unable to load waveform.'], waveformInvalid: ['Dữ liệu waveform không hợp lệ.', 'Invalid waveform data.'],
    trackSidebar: ['Người đăng và bài hát liên quan', 'Creator and related tracks'], creatorInfo: ['Thông tin người đăng', 'Creator information'], creatorStats: ['Thống kê bài hát công khai của người đăng', 'Creator public track statistics'],
    related: ['Cùng thể loại', 'Related tracks'], noRelated: ['Chưa có bài hát khác.', 'No other tracks yet.'], missingTrack: ['Không tìm thấy bài hát', 'Track not found'], backHome: ['Về trang chủ', 'Back to Home'],
    uploadBrand: ['Tải nhạc lên MediaHz', 'MediaHz Upload'], closeUpload: ['Đóng trang tải lên', 'Close upload page'], oneUpload: ['Một bài hát mỗi lần tải lên', 'One track per upload'], sizeLimit: ['25 MB / tệp', '25 MB / file'],
    uploadAudio: ['Tải tệp âm thanh', 'Upload audio'], dropzone: ['Vùng nhận tệp âm thanh kéo thả', 'Audio file drop zone'], chooseFile: ['Chọn tệp', 'Choose file'], manageTracks: ['Quản lý bài hát', 'Manage tracks'],
    uploadEyebrow: ['MEDIAHZ / TẢI LÊN', 'MEDIAHZ / UPLOAD'], uploadLimit: ['Một bài hát · Tối đa 25 MB', 'One track · Up to 25 MB'], uploadProgress: ['Tiến trình tải lên', 'Upload progress'], uploadPercent: ['Phần trăm dữ liệu đã gửi', 'Percentage of data sent'], uploadBytes: ['Dữ liệu đã gửi lên máy chủ', 'Data sent to server'],
    waiting: ['Chờ tải lên', 'Waiting to upload'], transferNotStarted: ['Chưa bắt đầu truyền dữ liệu', 'Transfer not started'], transferred: ['Đã truyền xong dữ liệu', 'Transfer complete'], transferWaiting: ['Đang chờ thông tin dung lượng truyền', 'Waiting for transfer size'],
    coverChoose: ['Chọn ảnh bìa', 'Choose cover image'], coverAdd: ['Thêm ảnh bìa', 'Add cover image'], coverChange: ['Đổi ảnh bìa', 'Change cover image'], coverRemove: ['Bỏ ảnh', 'Remove image'], coverHint: ['JPG, PNG hoặc WebP · Tối đa 5 MB', 'JPG, PNG or WebP · Up to 5 MB'],
    title: ['Tên bài hát ', 'Track title '], optional: ['Không bắt buộc', 'Optional'], titlePlaceholder: ['Nhập tên bài hát', 'Enter track title'], artistPlaceholder: ['Tên nghệ sĩ hoặc người thể hiện', 'Artist or performer name'], uncategorized: ['Chưa phân loại', 'Uncategorized'], genreHint: ['Bạn có thể bổ sung hoặc thay đổi thể loại sau khi tải lên.', 'You can add or change the genre after uploading.'],
    replaceFile: ['Đổi tệp', 'Replace file'], otherFile: ['Chọn tệp khác', 'Choose another file'], otherTrack: ['Tải bài khác', 'Upload another track'], checkLibrary: ['Kiểm tra Library', 'Check Library'], viewTrack: ['Xem bài hát', 'View track'], upload: ['Tải lên', 'Upload'], retryUpload: ['Thử tải lại', 'Retry upload'], checking: ['Đang kiểm tra...', 'Checking...'], uploading: ['Đang tải lên...', 'Uploading...'],
    uploadConnecting: ['Đang kết nối và gửi tệp...', 'Connecting and sending file...'], uploadProcessing: ['Đã gửi 100% dữ liệu · Đang hoàn tất', '100% of data sent · Finishing'], uploadSuccess: ['Tải lên thành công', 'Upload complete'], uploadError: ['Tải lên thất bại', 'Upload failed'], uploadWarning: ['Chưa xác nhận kết quả tải lên', 'Upload result unconfirmed'],
    processingHint: ['Tệp đã được gửi. Vui lòng giữ trang mở đến khi nhận kết quả.', 'The file has been sent. Keep this page open until the result arrives.'], percentHint: ['Phần trăm được tính theo dữ liệu đã gửi lên máy chủ.', 'The percentage measures data sent to the server.'],
    signInDescription: ['Đăng nhập để lưu những bài hát bạn yêu thích.', 'Sign in to save the tracks you love.'], closeLogin: ['Đóng đăng nhập', 'Close sign in'], account: ['Email hoặc tài khoản', 'Email or account'], password: ['Mật khẩu', 'Password'], or: ['hoặc', 'or'], google: ['Tiếp tục với Google', 'Continue with Google'],
    noAccount: ['Chưa có tài khoản? ', 'No account yet? '], hasAccount: ['Đã có tài khoản? ', 'Already have an account? '], register: ['Đăng ký', 'Register'], createAccount: ['Tạo tài khoản', 'Create account'],
    signingIn: ['Đang đăng nhập…', 'Signing in…', 'Đang đăng nhập...'], waitingGoogle: ['Đang chờ Google...', 'Waiting for Google...'], creatingAccount: ['Đang tạo tài khoản…', 'Creating account…'],
    home: ['Trang chủ', 'Home'], welcomeBack: ['Chào mừng trở lại MediaHz.', 'Welcome back to MediaHz.'], getStarted: ['Bắt đầu cùng MediaHz.', 'Get started with MediaHz.'], welcome: ['Chào mừng bạn đến với MediaHz.', 'Welcome to MediaHz.'], accountReady: ['Tài khoản đã sẵn sàng', 'Your account is ready'],
    confirmPassword: ['Xác nhận mật khẩu', 'Confirm password'], enterPassword: ['Nhập mật khẩu', 'Enter password'], createPassword: ['Tạo mật khẩu', 'Create a password'], repeatPassword: ['Nhập lại mật khẩu', 'Repeat password'], passwordMismatch: ['Mật khẩu xác nhận chưa khớp.', 'Passwords do not match.'],
    showPassword: ['Hiện mật khẩu', 'Show password'], hidePassword: ['Ẩn mật khẩu', 'Hide password'], showConfirm: ['Hiện mật khẩu xác nhận', 'Show confirmation password'], hideConfirm: ['Ẩn mật khẩu xác nhận', 'Hide confirmation password'],
    twoFactor: ['Mã xác thực hai bước hoặc mã khôi phục', 'Authenticator or recovery code'], twoFactorHint: ['Chỉ nhập khi tài khoản đã bật 2FA', 'Only enter if two-step verification is enabled'], closedAccount: ['Tài khoản đã tạm đóng', 'Temporarily closed account'], reactivate: [' Kích hoạt lại tài khoản đã vô hiệu hóa', ' Reactivate deactivated account'], cancelDeletion: [' Hủy yêu cầu xóa tài khoản', ' Cancel deletion request'],
    searchResults: ['Kết quả tìm kiếm', 'Search results'], noResults: ['Không tìm thấy kết quả.', 'No results found.'], searchPages: ['Các trang kết quả', 'Search pages'], previousPage: ['Trang trước', 'Previous page'], nextPage: ['Trang sau', 'Next page'],
    homeConnection: ['Không thể kết nối. Chọn Thử lại để tải trang khám phá.', 'Unable to connect. Select Try again to load Home.'],
    libraryConnection: ['Không thể kết nối. Danh sách hiện tại vẫn được giữ lại. Vui lòng thử lại.', 'Unable to connect. Your current list is still here. Please try again.'],
    profileConnection: ['Không thể kết nối. Những bài hát hiện tại vẫn được giữ lại.', 'Unable to connect. Your current tracks are still here.'],
    feedConnection: ['Không thể kết nối. Các bài đang hiển thị vẫn được giữ lại.', 'Unable to connect. Your current tracks are still here.'],
    checkAccount: ['Đang kiểm tra tài khoản…', 'Checking your account…'], feedCheckAccount: ['Đang xác nhận tài khoản hiện tại…', 'Checking the current account…'],
    verifyAccount: ['Không thể xác nhận tài khoản. Vui lòng thử lại.', 'Unable to verify your account. Please try again.'],
    profileVerifyAccount: ['Không thể xác nhận tài khoản. Chọn Thử lại.', 'Unable to verify your account. Select Try again.'],
    feedVerifyAccount: ['Chưa xác nhận được phiên đăng nhập. Bấm Thử lại để kết nối lại.', 'Unable to verify your session. Select Try again to reconnect.'],
    copiedTrack: ['Đã sao chép liên kết bài hát.', 'Track link copied.'], copyTrackError: ['Không thể sao chép liên kết.', 'Unable to copy the link.'],
    savedProfile: ['Đã lưu thay đổi.', 'Changes saved.'],
    imageError: ['Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.', 'Choose a JPG, PNG or WebP image up to 5 MB.'],
    imageReadError: ['Không thể đọc ảnh này. Chọn ảnh JPG, PNG hoặc WebP.', 'Unable to read this image. Choose a JPG, PNG or WebP image.'],
    imageSizeError: ['Chọn ảnh tối đa 40 megapixel và 16384 pixel mỗi chiều.', 'Choose an image up to 40 megapixels and 16384 pixels per side.'],
    uploadSending: ['Đang gửi dữ liệu · {percent}', 'Sending data · {percent}'],
    transferSummary: ['Đã gửi {sent} / {total}', 'Sent {sent} / {total}'],
    uploadNeedTitle: ['Vui lòng nhập tên bài hát.', 'Please enter a track title.'], uploadOneFile: ['Vui lòng chỉ chọn một bài hát cho mỗi lần tải lên.', 'Please choose one track per upload.'],
    uploadTypeError: ['Tệp phải có định dạng MP3, M4A, WAV hoặc FLAC.', 'The file must be MP3, M4A, WAV or FLAC.'],
    uploadSizeError: ['Tệp âm thanh phải lớn hơn 0 và không quá 25 MB.', 'Audio files must be larger than 0 and no larger than 25 MB.'],
    uploadCoverError: ['Ảnh bìa phải là JPG, PNG hoặc WebP, tối đa 5 MB.', 'Cover images must be JPG, PNG or WebP, up to 5 MB.'],
    updateSongs: ['Quản lý bài hát', 'Update Songs'], updateIntro: ['Chỉnh sửa thông tin bài hát.', 'Edit MP3 metadata stored in MongoDB.'],
    noSongs: ['Không tìm thấy bài hát.', 'No songs found.'], noImage: ['Chưa có ảnh', 'No Image'],
    updateName: ['Tên bài hát', 'Name'], category: ['Thể loại', 'Category'], noCategory: ['Chưa phân loại', 'No category'], userId: ['ID người dùng', 'User ID'], originalName: ['Tên tệp gốc', 'Original Name'], duration: ['Thời lượng (giây)', 'Duration (seconds)'],
    replaceImage: ['Thay ảnh bìa', 'Replace Image'], updateCoverHint: ['Chọn ảnh bìa mới, tối đa 5 MB.', 'Choose a new cover image, max 5MB.'], imageFields: ['Thông tin ảnh', 'Image fields'],
    imageUrl: ['URL ảnh', 'Image URL'], displayUrl: ['URL hiển thị', 'Display URL'], deleteUrl: ['URL xóa ảnh', 'Delete URL'], imageOriginal: ['Tên ảnh gốc', 'Image Original Name'], thumbUrl: ['URL ảnh thu nhỏ', 'Thumb URL'], thumbFilename: ['Tên tệp ảnh thu nhỏ', 'Thumb Filename'], thumbName: ['Tên ảnh thu nhỏ', 'Thumb Name'], thumbMime: ['MIME ảnh thu nhỏ', 'Thumb MIME'], thumbExtension: ['Phần mở rộng ảnh thu nhỏ', 'Thumb Extension']
  };
  const dictionary = { vi: {}, en: {} };
  const key = name => 'page.' + name;
  for (const [name, values] of Object.entries(pairs)) {
    dictionary.vi[key(name)] = values[0]; dictionary.en[key(name)] = values[1];
  }
  const selectors = [], changing = [];
  // direct:true keeps icons, counters, inputs, selects and inline profile names.
  const text = (selector, name) => selectors.push({ selector, key: key(name), direct: true });
  const attr = (selector, name, attribute) => selectors.push({ selector, key: key(name), attr: attribute });
  const accessible = (selector, name) => { attr(selector, name, 'aria-label'); attr(selector, name, 'title'); };
  function fixed(selector, names, attribute) {
    const sources = new Map();
    for (const name of names.split(' ')) for (const value of pairs[name]) sources.set(value.trim(), key(name));
    changing.push({ selector, sources, attribute });
  }
  const labels = (scope, entries) => { for (const [selector, name] of entries) text(scope + ' ' + selector, name); };

  labels('[data-home-view]', [
    ['.mh-home-eyebrow','homeEyebrow'], ['#homeHeading','discover'], ['[data-home-refresh] span','refresh'], ['.mh-home-toolbar>p','homeIntro'], ['.mh-home-toolbar>label','genre'], ['[data-home-category] option[value=""]','allGenres'], ['[data-home-changed]','homeChanged'], ['[data-home-empty] h2','noTracks'], ['[data-home-empty] p','homeEmpty'], ['[data-home-retry]','retry'], ['.mh-home-side-section:has([data-home-creators]) h2','creators'], ['.mh-home-side-section:has([data-home-creators])>p:not([data-home-creators-empty])','creatorsNote'], ['[data-home-creators-empty]','creatorsEmpty'], ['.mh-home-side-section:has([data-home-recent]) h2','history'], ['[data-home-login]','signIn'], ['.mh-home-footer','tagline']
  ]);
  attr('[data-home-refresh]', 'homeRefresh', 'aria-label'); attr('.mh-home-sidebar', 'homeSidebar', 'aria-label');
  fixed('[data-home-view] [data-home-status]', 'homeLoading homeRefreshing loading playing paused playError homeConnection checkAccount verifyAccount');
  fixed('[data-home-recent-empty]', 'recentEmpty recentRefresh recentGuest');
  for (const [id, title, copy] of [['for-you','forYou','forYouCopy'],['newest','releases','releasesCopy'],['popular','popular','popularCopy']]) {
    text('[data-home-shelf="'+id+'"] .mh-home-shelf-heading h2', title); text('[data-home-shelf="'+id+'"] .mh-home-shelf-heading p', copy);
  }
  text('[data-home-shelf^="genre-"] .mh-home-shelf-heading p', 'exploreGenre');
  text('[data-home-expand][aria-expanded="true"]','less'); text('[data-home-expand]:not([aria-expanded="true"])','viewAll');

  labels('[data-feed-view]', [
    ['.mh-feed-eyebrow','community'], ['#feedHeading','feed'], ['[data-feed-refresh]','refresh'], ['[data-feed-tab="following"]','following'], ['[data-feed-tab="discover"]','explore'], ['.mh-feed-filters>label:has([data-feed-category])','genre'], ['[data-feed-category] option[value=""]','allGenres'], ['[data-feed-sort-label]','sort'], ['[data-feed-sort] option[value="newest"]','feedNewest'], ['[data-feed-sort] option[value="popular"]','feedPopular'], ['[data-feed-changed]','feedChanged'], ['[data-feed-login]','signIn'], ['[data-feed-discover]','discover'], ['[data-feed-retry]','retry'], ['[data-feed-more]','more'], ['[data-feed-end]','feedEnd'], ['#feedCreatorsHeading','featuredCreators'], ['.mh-feed-sidebar-heading>span','exploreMore'], ['[data-feed-creators-retry]','retry'], ['.mh-feed-wave-empty','noWaveform'], ['[data-feed-message]>span:not([aria-hidden])','message']
  ]);
  attr('[data-feed-refresh]','feedRefresh','aria-label'); attr('.mh-feed-tabs','feedTabs','aria-label'); attr('.mh-feed-metrics','plays','title');
  fixed('[data-feed-status]','feedLoading feedLoadingMore feedConnection feedCheckAccount feedVerifyAccount'); fixed('[data-feed-creators-status]','findingCreators feedCreatorsEmpty feedCreatorsError');
  fixed('[data-feed-empty-title]','feedGuestTitle feedNoNew feedNoTracks'); fixed('[data-feed-empty-text]','feedGuestCopy feedNoGenre feedFollowCopy feedEmptyCopy');

  labels('[data-library-view]', [
    ['.mh-library-eyebrow','collection'], ['#libraryHeading','library'], ['.mh-library-heading>div>p:not(.mh-library-eyebrow)','libraryIntro'], ['[data-library-refresh] span','refresh'], ['[data-library-tab="likes"]','likedTracks'], ['[data-library-tab="history"]','history'], ['[data-library-tab="following"]','following'], ['.mh-library-search>.mh-library-sr-only','searchLibrary'], ['[data-library-genre-label]','genre'], ['[data-library-genre] option[value=""]','allGenres'], ['[data-library-toolbar]>label:has([data-library-sort])','sort'], ['[data-library-changed]','libraryChanged'], ['[data-library-empty]>a','discover'], ['[data-library-guest] h2','libraryGuest'], ['[data-library-guest] p','libraryGuestCopy'], ['[data-library-login]','signIn'], ['[data-library-guest] a','exploreMusic'], ['[data-library-retry]','retry'], ['[data-library-more]','more'], ['.mh-library-sidebar>section:has([data-library-help]) h2','makeYours'], ['.mh-library-sidebar>section:has([data-library-profile]) h2','quickAccess'], ['.mh-library-sidebar a[href="/discover"]','discoverNew'], ['.mh-library-sidebar a[href="/feed"]','yourFeed'], ['[data-library-profile]','yourProfile'], ['.mh-library-footer','tagline'], ['[data-library-message]','message']
  ]);
  attr('[data-library-refresh]','libraryRefresh','aria-label'); attr('.mh-library-tabs','yourLibrary','aria-label'); attr('.mh-library-sidebar','libraryTools','aria-label');
  fixed('[data-library-search]', 'searchLikes searchHistory searchFollowing', 'placeholder'); fixed('[data-library-sort] option','newest recentlyPlayed recentlyFollowed titleAZ nameAZ artistAZ');
  fixed('[data-library-help]','libraryHelpLikes libraryHelpHistory libraryHelpFollowing'); fixed('[data-library-status]','libraryLoading libraryRefreshing loadingMore libraryConnection checkAccount verifyAccount');
  fixed('[data-library-empty-title]','noLikes noHistory noFollowing noMatches'); fixed('[data-library-empty-copy]','noLikesCopy noHistoryCopy noFollowingCopy noMatchesCopy');

  labels('[data-profile-screen]', [
    ['.profile-eyebrow','profileEyebrow'], ['[data-profile-copy]','copyLink'], ['#editProfileButton','editProfile'], ['.profile-actions>a[href$="/edit"]','editProfile'], ['[data-profile-message]','message'], ['[data-profile-tab="tracks"]','tracks'], ['[data-profile-tab="about"]','about'], ['.profile-track-toolbar>label:has([data-profile-sort])','sort'], ['[data-profile-sort] option[value="newest"]','newestFirst'], ['[data-profile-sort] option[value="popular"]','mostPlayed'], ['[data-profile-sort] option[value="title"]','titleAZ'], ['[data-profile-empty] a[href="/product"]','uploadTrack'], ['[data-profile-more]','more'], ['[data-profile-retry]','retry'], ['#profilePanel-about>h2','aboutName'], ['#profilePanel-about>h3','web'], ['[data-profile-links-empty]','noLinks'], ['.profile-sidebar>section:has([data-profile-about])>h2','about'], ['[data-profile-about]','readMore'], ['.profile-sidebar>section:has(.profile-public-stats)>h2','publicTracks'], ['.profile-sidebar>section[data-profile-private]>h2','yourSpace'], ['.profile-sidebar a[href="/library"]','openLibrary'], ['.profile-sidebar a[href="/product"]','uploadMusic'], ['.profile-sidebar a[href="/users/settings"]','accountSettings'], ['.profile-footnote','tagline']
  ]);
  for (const name of ['followers','following','tracks','plays','likes']) text('[data-profile-screen] dl>div:has([data-profile-stat="'+name+'"]) dt',name);
  attr('[data-profile-copy-output]','profileLink','aria-label'); attr('.profile-tabs','profileTabs','aria-label'); attr('[data-profile-search]','searchTracks','placeholder'); attr('[data-profile-search]','searchTracks','aria-label'); attr('[data-profile-refresh]','refreshTracks','aria-label'); attr('.profile-sidebar','profileInfo','aria-label');
  fixed('[data-profile-empty] h2','noMatchingTracks noPublicTracks'); fixed('[data-profile-empty] p','trySearch firstTrack creatorUploads'); fixed('[data-profile-status]','feedLoadingMore refreshingTracks profileConnection profileVerifyAccount'); fixed('[data-profile-screen]>.profile-load-status','profileLoading');
  labels('[data-profile-missing]', [['h1','missingProfile'],['p','missingProfileCopy'],['a','discover']]);
  labels('#profileEditDialog', [
    ['#profileEditTitle','editProfile'], ['.profile-banner-field>.profile-file-heading','banner'], ['[data-profile-file-target="profileBannerFile"]','updateBanner'], ['[data-profile-file-target="profileAvatarFile"]','updateImage'], ['#profileImageHint','imageHint'], ['label[for="profileFullNameInput"]','displayName'], ['label[for="profileTagInput"]','profileTag'], ['label[for="profileFirstNameInput"]','firstName'], ['label[for="profileLastNameInput"]','lastName'], ['label[for="profileCityInput"]','city'], ['label[for="profileCountryInput"]','country'], ['label[for="profileBioInput"]','bio'], ['#profileLinksTitle','yourLinks'], ['#profileAddLink','addLink'], ['.profile-form-actions [data-close-profile]','cancel'], ['.profile-link-row>div:has(.profile-link-label)>label','linkTitle']
  ]);
  fixed('#profileSaveButton','saveChanges saving'); attr('#profileTagInput','tagHint','title'); attr('#profileBannerFile','banner','aria-label'); attr('#profileAvatarFile','avatar','aria-label');
  accessible('[data-profile-adjust="profileBannerFile"]','adjustBanner'); accessible('[data-profile-adjust="profileAvatarFile"]','adjustAvatar'); accessible('#profileEditDialog .profile-close','close'); accessible('#profileEditDialog .profile-remove-link','removeLink');
  labels('#profileCropDialog', [['.profile-form-actions [data-close-crop]','cancel'],['#profileCropApply','apply']]);
  fixed('#profileCropTitle','adjustImage adjustAvatar adjustBanner'); fixed('#profileFormError','imageError'); fixed('#profileCropError','imageReadError imageSizeError'); fixed('#profileSaveStatus','savedProfile');
  accessible('#profileCropDialog .profile-close','closeEditor'); accessible('#profileCropReset','centerImage'); attr('#profileCropStage','imagePosition','aria-label'); fixed('#profileCropStatus','imageLoading');

  labels('[data-track-view]', [
    ['[data-waveform-retry]','retry'], ['.track-toolbar [data-song-like]','like'], ['[data-track-share]','share'], ['.track-about>h2','trackInfo'], ['.track-about dl>div:nth-child(1)>dt','artist'], ['.track-about dl>div:nth-child(2)>dt','album'], ['.track-about dl>div:nth-child(3)>dt','genre'], ['.track-about dl>div:nth-child(4)>dt','uploadDate'], ['.track-about dl>div:nth-child(5)>dt','originalFile'], ['.track-about dl>div:nth-child(6)>dt','fileSize'], ['.track-stats>span:has([data-song-plays])','playSuffix'], ['.track-stats>span:has([data-song-likes])','likeSuffix'], ['[data-creator-message]','message'], ['.track-related>h2','related'], ['.track-related>.track-muted','noRelated']
  ]);
  accessible('[data-track-play].is-playing','pause'); accessible('[data-track-play]:not(.is-playing)','play');
  attr('[data-track-waveform]','seekWaveform','aria-label'); attr('.track-sidebar','trackSidebar','aria-label'); attr('[data-track-creator]','creatorInfo','aria-label'); attr('.track-creator-stats','creatorStats','aria-label');
  for (const name of ['plays','likes','tracks']) text('.track-creator-stats>div:has([data-creator-total="'+name+'"])>dt',name);
  fixed('[data-waveform-status]','waveformLoading waveformError waveformInvalid'); fixed('[data-track-feedback]','copiedTrack copyTrackError'); text('.track-missing h1','missingTrack'); text('.track-missing>a','backHome');

  labels('[data-upload-view]', [
    ['.upload-brand h1','uploadBrand'], ['.upload-selection-limits>span:first-child','oneUpload'], ['.upload-selection-limits>span:last-child','sizeLimit'], ['#uploadSelectTitle','uploadAudio'], ['#uploadChooseFiles','chooseFile'], ['.upload-select-links>a','manageTracks'], ['.upload-single-eyebrow','uploadEyebrow'], ['#uploadDetailsTitle','trackInfo'], ['.upload-details-heading>.upload-single-caption','uploadLimit'], ['.upload-artwork-placeholder>strong','coverAdd'], ['.upload-artwork-change','coverChange'], ['.upload-artwork-info>span','coverHint'], ['#uploadRemoveCover','coverRemove'], ['label[for="uploadTitle"]','title'], ['label[for="uploadArtist"]','artist'], ['label[for="categoryId"]','genre'], ['.upload-optional','optional'], ['#categoryId option[value=""]','uncategorized'], ['.upload-single-fields>p.upload-single-caption','genreHint'], ['#uploadReplace','replaceFile'], ['#uploadLibraryLink','checkLibrary'], ['#uploadSongLink','viewTrack']
  ]);
  accessible('[data-upload-view] .upload-close','closeUpload'); attr('#uploadDropzone','dropzone','aria-label'); attr('#uploadProgressContainer','uploadProgress','aria-label'); attr('#uploadPercent','uploadPercent','aria-label'); attr('#uploadProgressBar','uploadBytes','aria-label'); attr('#uploadArtwork','coverChoose','aria-label');
  attr('#uploadTitle','titlePlaceholder','placeholder'); attr('#uploadArtist','artistPlaceholder','placeholder');
  fixed('#uploadBtn>span','upload retryUpload checking uploading'); fixed('#uploadReset>span','otherFile otherTrack'); fixed('#uploadStatus','waiting uploadConnecting uploadProcessing uploadSuccess uploadError uploadWarning');
  fixed('#uploadTransferSummary','transferNotStarted transferred transferWaiting'); fixed('#uploadStatusHint','processingHint percentHint');
  fixed('[data-upload-view] #uploadAlert','uploadNeedTitle uploadOneFile uploadTypeError uploadSizeError uploadCoverError');

  labels('.update-page', [['.page-header h1','updateSongs'],['.page-header p','updateIntro'],['.header-actions a[href="/product"]','upload'],['.header-actions a[href="/discover"]','home'],['.empty-state','noSongs'],['.cover-placeholder','noImage'],['.song-form button[type="submit"]','saveChanges'],['.image-details>summary','imageFields'],['.song-form .form-text','updateCoverHint'],['select[name="categoryId"] option[value=""]','noCategory']]);
  for (const [field, name] of [['name','updateName'],['artist','artist'],['categoryId','category'],['userID','userId'],['originalName','originalName'],['fileSize','fileSize'],['duration','duration'],['uploadDate','uploadDate'],['imageFile','replaceImage'],['imageUrl','imageUrl'],['imageDisplayUrl','displayUrl'],['imageDeleteUrl','deleteUrl'],['imageOriginalName','imageOriginal'],['imageThumbUrl','thumbUrl'],['imageThumbFilename','thumbFilename'],['imageThumbName','thumbName'],['imageThumbMime','thumbMime'],['imageThumbExtension','thumbExtension']]) {
    text('.update-page .field:has([name="'+field+'"])>label',name);
  }

  // State selectors translate fixed controls without reading names or counts.
  const follows = '[data-home-follow], [data-feed-follow], [data-library-follow], [data-profile-follow], [data-creator-follow]';
  for (const selector of follows.split(', ')) { text(selector+'[aria-pressed="true"]','following'); text(selector+':not([aria-pressed="true"])','follow'); }
  for (const scope of ['[data-home-view]','[data-feed-view]','[data-library-view]','[data-profile-screen]','[data-track-view]']) {
    attr(scope+' [data-song-like][aria-pressed="true"]','unlike','aria-label'); attr(scope+' [data-song-like]:not([aria-pressed="true"])','like','aria-label');
  }
  for (const prefix of ['home','feed','library','profile']) text('[data-'+prefix+'-queue]>span:not([aria-hidden])','nextUp');
  fixed('[data-library-playback], [data-profile-playing]', 'playing paused loading playError');

  labels('#loginPopup', [['#loginPopupTitle','signIn'],['#loginPopupDescription','signInDescription'],['label[for="popupAccount"]','account'],['label[for="popupPassword"]','password'],['.login-popup-divider>span','or'],['[data-login-google]','google'],['.login-popup-register','noAccount'],['.login-popup-register>a','register']]);
  accessible('[data-login-close]','closeLogin'); fixed('[data-login-submit]','signIn signingIn waitingGoogle');
  labels('.signin-page', [['#signinTitle','signIn'],['#signinForm label[for="password"]','password'],['#registerForm label[for="registerPassword"]','password'],['#registerForm label[for="confirmPassword"]','confirmPassword'],['.signin-divider>span','or'],['.signin-google','google']]);
  fixed('.signin-page .signin-register-link, .signin-page .signin-back, .signin-page .signin-create>a, .signin-page a.signin-submit','home signIn createAccount register');
  fixed('.signin-page .signin-subtitle','welcomeBack getStarted welcome'); fixed('#registerTitle','createAccount accountReady'); fixed('.signin-page .signin-create','noAccount hasAccount');
  fixed('#signinSubmit','signIn signingIn'); fixed('#registerSubmit','createAccount creatingAccount'); text('#passwordMatchError','passwordMismatch');
  attr('#password','enterPassword','placeholder'); attr('#registerPassword','createPassword','placeholder'); attr('#confirmPassword','repeatPassword','placeholder');
  for (const [selector, show, hide] of [['[data-login-reveal], #togglePassword, [data-password-target="registerPassword"]','showPassword','hidePassword'],['[data-password-target="confirmPassword"]','showConfirm','hideConfirm']]) {
    for (const button of selector.split(', ')) { accessible(button+'[aria-pressed="true"]',hide); accessible(button+':not([aria-pressed="true"])',show); }
  }
  text('.login-security-fields>label','twoFactor'); attr('.login-security-fields>input[name="twoFactorCode"]','twoFactorHint','placeholder'); text('.login-security-fields summary','closedAccount');
  text('.login-security-fields label:has(input[name="reactivate"])','reactivate'); text('.login-security-fields label:has(input[name="cancelDeletion"])','cancelDeletion');
  labels('[data-search-results]', [['#searchResultsTitle','searchResults'],['.search-empty','noResults']]); attr('.search-pagination','searchPages','aria-label'); accessible('.search-pagination [rel="prev"]','previousPage'); accessible('.search-pagination [rel="next"]','nextPage');

  language.register(dictionary);
  language.registerSelectors(selectors);
  function directText(node) { return Array.from(node.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim(); }
  function updateFixed() {
    for (const rule of changing) for (const node of document.querySelectorAll(rule.selector)) {
      const current = rule.attribute ? node.getAttribute(rule.attribute)?.trim() : directText(node);
      const translationKey = rule.sources.get(current);
      if (!translationKey) continue; // Leave unknown messages and empty slots to their controller.
      const value = language.t(translationKey);
      if (rule.attribute) { if (node.getAttribute(rule.attribute) !== value) node.setAttribute(rule.attribute, value); }
      else {
        const nodes = Array.from(node.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        if (nodes.length && (nodes[0].textContent !== value || nodes.length > 1)) {
          nodes[0].textContent = value; for (const extra of nodes.slice(1)) extra.remove();
        }
      }
    }
    // Exact controller formats in upload-only slots; interpolation preserves the
    // measured amounts and never reads a filename or a user-entered title.
    const upload = document.querySelector('[data-upload-view]');
    const status = upload?.querySelector('#uploadStatus');
    if (upload?.dataset.uploadState === 'sending' && status) {
      const match = /^(?:Đang gửi dữ liệu|Sending data) · (\d{1,3}%)$/.exec(status.textContent);
      if (match) {
        const value = language.t(key('uploadSending'), { percent: match[1] });
        if (status.textContent !== value) status.textContent = value;
      }
    }
    const transfer = upload?.querySelector('#uploadTransferSummary');
    if (transfer) {
      const match = /^(?:Đã gửi|Sent) ([\d.]+ (?:KB|MB)) \/ ([\d.]+ (?:KB|MB))$/.exec(transfer.textContent);
      if (match) {
        const value = language.t(key('transferSummary'), { sent: match[1], total: match[2] });
        if (transfer.textContent !== value) transfer.textContent = value;
      }
    }
    // These templates declare English even when inserted into a Vietnamese shell.
    for (const node of document.querySelectorAll('[data-home-view][lang], [data-library-view][lang], [data-profile-screen][lang]')) {
      if (node.lang !== language.language) node.lang = language.language;
    }
  }
  let queued = false;
  function schedule() { if (!queued) { queued = true; queueMicrotask(() => { queued = false; updateFixed(); }); } }
  // The runtime handles inserted nodes; also handle direct text edits and state
  // changes, which do not necessarily produce a childList mutation.
  const targets = changing.map(rule => rule.selector).join(', ') + ', ' + follows + ', [data-home-expand], [data-track-play], [data-song-like], [data-login-reveal], #togglePassword, [data-password-target]';
  new MutationObserver(records => {
    let stateChanged = false, relevant = false;
    for (const record of records) {
      const node = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (record.type === 'childList') {
        // Ignore clocks, song titles and unrelated shell mutations. A newly
        // inserted page/row can contain one of our known dynamic label slots.
        if (node?.matches(targets) || Array.from(record.addedNodes).some(added => added.nodeType === Node.ELEMENT_NODE && (added.matches(targets) || added.querySelector(targets)))) relevant = true;
        continue;
      }
      if (!node?.matches(targets)) continue;
      relevant = true;
      if (record.type === 'attributes' && ['aria-pressed','aria-expanded','class'].includes(record.attributeName)) stateChanged = true;
      if (record.type === 'characterData' && node.matches(follows)) stateChanged = true;
    }
    if (stateChanged) language.translate();
    if (relevant) schedule();
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-pressed','aria-expanded','aria-label','title','placeholder','class'] });
  window.addEventListener('mediahz:languagechanged', updateFixed);
  document.addEventListener('mediahz:navigated', schedule);
  window.MediaHzPageTranslations = Object.freeze({ translate: updateFixed });
  updateFixed();
})();
