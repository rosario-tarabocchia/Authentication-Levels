//jshint esversion:6
require("dotenv").config()
const express = require("express");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const {
  redirect
} = require("express/lib/response");
// passport local not needed
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const encrypt = require("mongoose-encryption"); Level 2
// const md5 = require("md5"); Level 3
// const bcrypt = require("bcrypt"); Level 4
// const saltRounds = 10;

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({
  extended: true
}));
app.use(express.static("public"));

// Important- seesion goes here:

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({

  email: String,
  password: String,
  googleId: String,
  facebookID: String,
  secret: String

});

// const secret = process.env.SECRET_KEY;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"

  },
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
  },
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function (req, res) {

  res.render("home");
});

// GOOGLE ROUTE
app.route("/auth/google")

  .get(passport.authenticate("google", {
      scope: ["profile",]
    })

  );

app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });


// FACEBOOK ROUTE

app.get("/auth/facebook", passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    failureRedirect: "/login"
  }),
  function (req, res) {
    // Successful authentication, redirect to secrets page
    res.redirect("/secrets");
  });







app.get("/register", function (req, res) {

  res.render("register");
});

app.get("/login", function (req, res) {

  res.render("login");
});

app.get("/secrets", function (req, res) {

 User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});

        }
      }

 });

});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");

});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }

});

app.post("/register", function (req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");

    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");

      });

    }


  });



  // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //     const newUser = new User({
  //         email: req.body.username,
  //         password: hash,
  //     });

  //     newUser.save(function (err) {
  //         if (err) {
  //             console.log(err);
  //         } else {
  //             res.render("secrets");

  //         }

  //     });
  // });

});

app.post("/login", passport.authenticate("local", {

  successRedirect: "/secrets",

  failureRedirect: "/login"


  // const username = req.body.username;
  // const password = req.body.password;

  // User.findOne({
  //     email: username
  // }, function (err, foundUser) {

  //     if (err) {
  //         console.log(err);
  //     } else {
  //         if (foundUser) {
  //             bcrypt.compare(password, foundUser.password, function (err, result) {
  //                 if (result === true) {

  //                     res.render("secrets");
  //                 }

  //             });

  //         };
  //     };

  // });


}));

  app.post("/submit", function(req, res){
      const submittedSecret = req.body.secret;
      console.log(req.user);
      

      User.findById(req.user._id, function(err, foundUser){
          if (err) {
            console.log(err);
            
          } else {
            console.log('HERE');
            console.log(foundUser);
            
            
              if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                  console.log('SaVED');
                  
                  res.redirect("/secrets");
                });
              }

          }

      });



  });






app.listen(3000, function () {
  console.log("Server started on port 3000");
});