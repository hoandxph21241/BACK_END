const router = require('express').Router();
const paths = require('../public/javascripts/page_paths');
const shell = require('../controllers/CTL_home');
const queryOf = req => { const index = req.originalUrl.indexOf('?'); return index < 0 ? '' : req.originalUrl.slice(index); };

router.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method)) return next();
  const canonical = paths.canonicalPath(req.path);
  if (canonical !== req.path) return res.redirect(308, canonical + queryOf(req));
  next();
});
function page(path, controller) {
  return (req, res, next) => {
    res.vary('X-Requested-With');
    if (req.xhr) return controller(req, res, next);
    res.locals.initialView = path + queryOf(req);
    return shell.Home(req, res, next);
  };
}
router.get(paths.discover, page(paths.discover, require('../modules/home/controller/HomeController').page));
router.get(paths.feed, page(paths.feed, require('../modules/feed/controller/FeedController').page));
router.get(paths.library, page(paths.library, require('../modules/library/controller/LibraryController').page));

// Cached older shells may still request these renamed public assets.
for (const [oldName, newName] of [['discover', 'discover-page'], ['feed_stream', 'feed-page'], ['collection', 'library-page']]) {
  for (const [folder, extension] of [['javascripts', 'js'], ['stylesheets', 'css']]) {
    router.get('/' + folder + '/home/' + oldName + '.' + extension,
      (req, res) => res.redirect(308, '/' + folder + '/home/' + newName + '.' + extension + queryOf(req)));
  }
}
module.exports = router;
