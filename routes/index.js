/* DEPENDENCIES */
var express     = require("express"),
    router      = express.Router(),
    passport    = require("passport"),
    User        = require("../models/user"),
    async       = require("async"),
    nodemailer  = require("nodemailer"),
    crypto      = require("crypto");

//root
router.get("/", function(req, res){
    res.render("landing");
});


//===============
//= AUTH Routes =
//===============
//show register form
router.get("/register", function(req, res) {
    res.render("register", {page: 'register'});
})
//handle sign-up logic
router.post("/register", function(req, res) {
    //checking if email and retyped email fields are the same first
    if(req.body.email !== req.body.emailRetyped){
        req.flash("error", "'Email' and 'Retype Email' fields are not matching!");
        return res.redirect("/register");
    }
    //register the user in DB
    var newUser = new User({username: req.body.username, email: req.body.email});
    if(req.body.adminCode === process.env.ADMIN_USER_CODE){
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            if((err.message).includes("email_1 dup key")){
                err.message = "Email ("+req.body.email+") already exist";
            }
            return res.render("register", {error: err.message});
        }
        //after creating the user, we now login
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to YelpCamp "+user.username);
            res.redirect("/campgrounds"); 
        });
    });
})

//show login form
router.get("/login", function(req, res) {
    res.render("login", {page: 'login'});
});
//handle login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login",
        failureFlash : true
    }), function(req, res) {
});

//logout route
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "See you later!")
    res.redirect("/campgrounds");
});

//forgot password
router.get("/forgot", function(req, res) {
    res.render("forgot");
});

//handle reset password
router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            type: "plain",
            user: process.env.GMAILACCOUNT,
            pass: process.env.GMAILPW
        }
      });
    // const smtpTransport = nodemailer.createTransport({
    //     service: 'gmail',
    //     auth: {
    //         type: 'OAuth2',
    //         user: process.env.GMAILACCOUNT,
    //         clientId: process.env.GMAILOAUTH_CLIENTID,
    //         clientSecret: process.env.GMAILOAUTH_CLIENTSECRET,
    //         refreshToken: process.env.GM_REFRESH_TOKEN,
    //         accessToken: process.env.GM_ACCESS_TOKEN
    //     },
    // });
      var mailOptions = {
        to: user.email,
        from: process.env.GMAILACCOUNT,
        subject: 'Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err){
        console.log("\n\n###### ERROR when trying to send email!");
        return next(err);
    } 
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
            //type: "OAuth2",
            user: process.env.GMAILACCOUNT,
            pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.GMAILACCOUNT,
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});

module.exports = router;