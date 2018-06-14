/* APP dependencies */
var express         = require("express"),
    app             = express(),
    bodyParser      = require("body-parser"),       //for POST requests parsing
    mongoose        = require("mongoose"),          //for DB
    flash           = require("connect-flash"),     //for flash messages
    passport        = require("passport"),          //fur authentication
    LocalStrategy   = require("passport-local"),    //for "local" auth
    methodOverride  = require("method-override"),
    User            = require("./models/user"),
    seedDB          = require("./seeds");
app.locals.moment   = require("moment");          //for time stamp of comments

/* ROUTES dependencies */
var indexRoutes         = require("./routes/index"),
    campgroundRoutes    = require("./routes/campgrounds"),
    commentRoutes       = require("./routes/comments");

/* APP config */
app.set("view engine", "ejs");                              //adding .ejs suffix
app.use(express.static(__dirname+"/public"));               //public dir
app.use(bodyParser.urlencoded({extended: true}));           //body-parser
var url = process.env.HERO_DEF_PROD_DB_URL || process.env.LOCAL_DB_URL; //this is a backup if the heroku env variable is not accessible
mongoose.connect(url);      //connecting to our db
app.use(flash());


/* SEED the DB */
//seedDB();

/* PASSPORT config */
app.use(require("express-session")({
    secret: "This is a woderawful world",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//global vars
app.use(function(req, res, next){
    res.locals.currentUser  = req.user;             //global var 'currentUser' - passing on object that include username inside
    res.locals.error        = req.flash("error");   //for flash 'error' message 
    res.locals.success      = req.flash("success"); //for flash 'success' message
    next();
});

/* ROUTES config*/
app.use(methodOverride("_method"));
app.use(indexRoutes);
app.use("/campgrounds/", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);



//server listener
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("The YelpCamp Server has started!");
});