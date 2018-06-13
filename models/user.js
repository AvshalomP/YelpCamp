var mongoose                = require("mongoose");
var passportLocalMongoose   = require("passport-local-mongoose");
//var bcrypt                  = require("bcrypt-nodejs");

var userSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: String,
    email: {type: String, unique: true, required: true}, //'unique' means that we can have only 1 user with this email!
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false} //boolean to set if user is admin or not
})

userSchema.plugin(passportLocalMongoose);   //adding methods that relates auth to User

module.exports = mongoose.model("User", userSchema);