const { validProfileSlug } = require('./permalink');
// Previous public prefix: '/profile/'. Existing slugs remain unchanged.
module.exports = user => validProfileSlug(user?.profileSlug) ? '/users/profile/' + user.profileSlug : null;
