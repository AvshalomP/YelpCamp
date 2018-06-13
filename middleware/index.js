var Campground      = require("../models/campground");
var Comment         = require("../models/comment");
var middlewareObj   = {};

//middleware method
middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in to do that!");
    res.redirect("/login");
}

//Campground middleware for Authentication + Authorization 
middlewareObj.checkCampgroundOwnership = function(req, res, next){
    //is user is logged in?
    if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, foundCampground){
            if(err || !foundCampground){ //we enter if we got error or if the pass vampground id is invalid/not exist!
                console.log(err);
                req.flash("error", "Campground not found");
                res.redirect("back");   //bring us back to the previous page
            } else{
                //Authorization - does the user own a campground?
                if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){ //check to see if the current user is the author of the current campground
                    next();
                } else{
                    req.flash("error", "Permission denied");
                    res.redirect("back")
                }
            }
        });   
    } else{
        req.flash("error", "You need to be logged in to do that!");
        res.redirect("back");
    }
}

//Comment middleware for Authentication + Authorization 
middlewareObj.checkCammentOwnership = function(req, res, next){
    //is user is logged in?
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundCamment){
            if(err || !foundCamment){
                console.log(err);
                req.flash("error", "Comment not found");
                res.redirect("back");   //bring us back to the previous page
            } else{
                //Authorization - does the user own a comment?
                if(foundCamment.author.id.equals(req.user._id) || req.user.isAdmin){ //check to see if the current user is the author of the current campground
                    next();
                } else{
                    req.flash("error", "Permission denied");
                    res.redirect("back")
                }
            }
        });   
    } else{
        res.redirect("back");
    }
}

module.exports = middlewareObj;