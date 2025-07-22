var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

//session
var session = require('express-session')

const passport = require('passport');
require('dotenv').config({ path: '../env/B_E_S.env' });
require('./config/passport');

var indexRouter = require('./routes/index');


var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.listen(() => {
  console.log(`✅ Server đang chạy tại http://localhost:3000/home`);
});

//session check
app.use(session({
  secret: 'AAAAAAAAABBBBBBBBBCCCCCCCDDDDDDD',
  resave: false,
  saveUninitialized: true,
//  cookie: { secure: true },
}))


// Passport
app.use(passport.initialize());
app.use(passport.session());


app.use('/', indexRouter);

//user
var usersRouter = require('./routes/RT_user');
app.use('/users', usersRouter);

//home
var HomeRounter = require("./routes/RT_home");
app.use("/home", HomeRounter);

//auth
var AuthRounter = require("./routes/RT_auth");
app.use("/auth", AuthRounter);


//dashboard
var DashboardRounter = require("./routes/RT_dashboard");
app.use("/dashboard", DashboardRounter);

//dashboard
var ProductRounter = require("./routes/RT_product");
app.use("/product", ProductRounter);


// iframe Mediabar
app.get('/mediabar', (req, res) => {
  res.render('inc/mediabar');
});
// iframe Mediabar v2
app.get('/mediabar_v2', (req, res) => {
  res.render('inc/mediabar_v2');
});

app.get('/network-popup', (req, res) => {
  res.render('inc/Network');
});



// //api
// var apiRouter = require("./routes/api_Rounters");
// app.use("/api", apiRouter);


app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.send(`Welcome ${req.user.displayName}`);
});


app.use(function(req, res, next) {
  next(createError(404));
});
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);

  // link api
  if (req.originalUrl.indexOf("/api") === 0) {
    return res.json({
      status: err.status,
      msg: err.message,
    });
  } else {
    return res.render("error");
  }
});


module.exports = app;
