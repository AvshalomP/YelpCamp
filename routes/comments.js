/* DEPENDENCIES */
var express     = require("express"),
    router      = express.Router({mergeParams: true}),  //we are adding the {mergeParams: true}, because our /:id param is obtained 
                                                        //in the app.js file ('cause of the routes shortning) rather than here and 
                                                        //this allow us to obtain 'id' here as well 
    Campground  = require("../models/campground"),
    Comment     = require("../models/comment"),
    middleware  = require("../middleware");         //notice here that we don't have to require the 'index.js' file itself, because
                                                    //it's done automatically when we have a file named 'index.js'

//===================
//= Comments Routes =
//===================
//NEW - show form to create a new comment
router.get("/new", middleware.isLoggedIn, function(req, res) {
    //find a campground by ID
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err){
            console.log(err);
        } else{
            //render and send the campground we found
            res.render("comments/new", {campground: foundCampground});
        }
    });
});
//CREATE - add a new comment to DB
router.post("/", middleware.isLoggedIn, function(req, res) {
    var newComment = req.body.comment;
    
    //lookup campground by ID
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err){
            console.log(err)
            res.redirect("/campgrounds");
        } else{
            //create new comment
            Comment.create(newComment, function(err, comment){
                if(err){
                    console.log(err);
                } else{
                    //add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    //save comment
                    comment.save();
                    //connect new comment to campground
                    foundCampground.comments.push(comment);
                    foundCampground.save(function(err, campground){
                        if(err){
                            console.log(err);
                        } else{
                            req.flash("success", "Successfully added comment");
                            res.redirect("/campgrounds/"+foundCampground._id);     
                        }
                    });
                }
            });
        }
    });
});


//EDIT - eddit a specific comment
router.get("/:comment_id/edit", middleware.checkCammentOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground) { //this is to avoid someone chage the campground id when in edit comment page!
        if(err || !foundCampground){
            req.flash("error", "Campground not found");
            return res.redirect("/campgrounds");
        } else{
            Comment.findById(req.params.comment_id, function(err, foundComment){
                if(err){
                    res.redirect("back");
                } else{
                    res.render("comments/edit", {campground_id: req.params.id, comment: foundComment}); 
                }
            });
        }
    })
});

//UPDATE - a specific comment
router.put("/:comment_id", middleware.checkCammentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err){
            console.log(err);
            res.redirect("back");
        } else{
            res.redirect("/campgrounds/"+req.params.id);
        }
    });
});

//DELETE - delete a specific comment
router.delete("/:comment_id", middleware.checkCammentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            console.log(err);
            res.redirect("back");
        } else{
            req.flash("success", "Comment deleted");
            res.redirect("/campgrounds/"+req.params.id);
        }
    });
});


module.exports = router;