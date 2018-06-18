/* DEPENDENCIES */
var express     = require("express"),
    router      = express.Router(),
    Campground  = require("../models/campground"),
    middleware  = require("../middleware");         //notice here that we don't have to require the 'index.js' file itself, because
                                                    //it's done automatically when we have a file named 'index.js'
/* MAPS dependency*/
var NodeGeocoder = require('node-geocoder');
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
var geocoder = NodeGeocoder(options);                
 
/* For image uploading */ 
//Multer Config
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})
//Cloudinary Config
var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'avshalomp', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//======================
//= Campgrounds Routes =
//======================
//INDEX - show all campgrounds
router.get("/", function(req, res){
    var noMatch = null;     //for empty search string
    if(req.query.search){   //params that are sent through a GET request of a <form> are being passed through the req.query object
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        //get subset of campgrounds from DB:
        Campground.find({ name: regex }, function(err, allCampgrounds){
            if(err){
                console.log(err);
            } else{
                if(allCampgrounds.length < 1){
                    noMatch = "No campgrounds match that search, please try again..";
                }
                res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds", noMatch: noMatch});
            }
        });
    } else{
        //get all campgrounds from DB:
        Campground.find({}, function(err, allCampgrounds){
            if(err){
                console.log(err);
            } else{
                res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds", noMatch: noMatch});
            }
        });
    }
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), async function(req, res){
    // add author to campground
    req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
    };
    //resolve coordinants out of location entered
    await geocoder.geocode(req.body.campground.location, function (err, data) {
        if (err || !data.length) {
          req.flash('error', 'Invalid address');
          return res.redirect('back');
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
    });
    if(req.file){ //if we got file to upload
        
        try{
            // upload image from user
            var result = await cloudinary.v2.uploader.upload(req.file.path);
            // add cloudinary url for the image to the campground object under image property
            req.body.campground.image = result.secure_url;
            // add image id so we can delete (destroy) it later on
            req.body.campground.imageId = result.public_id; 
        } catch(err){
            req.flash("error", err.message);
            return res.redirect("back");
        }
    } else{//this is url image
        //clearing imageId field for future image upload
        req.body.campground.imageId = "";
    }
    
    var newCampground = req.body.campground;
    // Create a new campground and save to DB
    Campground.create(newCampground, function(err, newlyCreated){
    if(err){
        req.flash("error", err.message);
        return res.redirect("back");
    } else {
        //redirect back to campgrounds page
        req.flash("success", "Campground was added successfully");
        res.redirect("/campgrounds");
    }
    });


});

//NEW - show form to create new campground 
router.get("/new", middleware.isLoggedIn, function(req, res) {
   res.render("campgrounds/new");
});

//SHOW - shows more info about one campground (identified by id)
//NOTE: that it has to come AFTER get /campgrounds/new, otherwise /campgrounds/new will end up here 
router.get("/:id", function(req, res) {
    //find the campground with the provided id
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
            req.flash("error", "Campground not found");
            res.redirect("back");
        } else{
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

//EDIT - show edit form for a specific campground
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground){
        res.render("campgrounds/edit", {campground: foundCampground});
    });   
});

//UPDATE - particular campground, then redirect somewhere
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
    Campground.findById(req.params.id, async function(err, campground) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
        //check if the image was uploaded
        if(req.file){
            try {
                if(campground.imageId){//if the previous image was url image
                    //delete old image
                    await cloudinary.v2.uploader.destroy(campground.imageId);   
                }
                //upload new image
                var result = await cloudinary.v2.uploader.upload(req.file.path);
                //update new image values in campground
                campground.image = result.secure_url;
                campground.imageId = result.public_id;
                
            } catch(err){
                req.flash("error", err.message);
                return res.redirect("back");
            }
        }
        else{//if the image update was image URL
            campground.image = req.body.campground.image;
            //clearing imageId field
            campground.imageId = "";
        }
        await geocoder.geocode(req.body.location, function (err, data) {
            if (err || !data.length) {
              req.flash('error', 'Invalid address');
              return res.redirect('back');
            }
            campground.lat = req.body.campground.lat = data[0].latitude;
            campground.lng = req.body.campground.lng = data[0].longitude;
            campground.location = req.body.campground.location = data[0].formattedAddress;
        });
        
        //saving updated vals to campground
        campground.name = req.body.campground.name;
        campground.cost = req.body.campground.cost;
        campground.description = req.body.campground.description;
        campground.save();
        req.flash("success","Successfully Updated!");
        res.redirect("/campgrounds/" + campground._id);
    });
});

//DESTROY - delete a certain campground
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, async function(err, campground) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
        //check if the image was uploaded
        if(campground.imageId){
            try {
                //deleting image from cloudinary
                await cloudinary.v2.uploader.destroy(campground.imageId);
            } catch(err) {
                if(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
                }
            }
        }
        //delete campground from DB
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campgrounds');
    });
});

//regex generator for fuzzy search
function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;