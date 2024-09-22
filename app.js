var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

//session
var session = require('express-session')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//session check
app.use(session({
  secret: 'AAAAAAAAABBBBBBBBBCCCCCCCDDDDDDD',
  resave: false,
  saveUninitialized: true,
//  cookie: { secure: true },
}))


app.use('/', indexRouter);
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

// //api
// var apiRouter = require("./routes/api_Rounters");
// app.use("/api", apiRouter);


app.use(function(req, res, next) {
  next(createError(404));
});
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);

  // link api
  if (req.originalUrl.indexOf("/api") == 0) {
    res.json({
      status: err.status,
      msg: err.message,
    });
  } else {
    res.render("error");
  }
  res.render("error");
});

module.exports = app;
