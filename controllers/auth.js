const bcrypt = require("bcryptjs");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { validationResult } = require("express-validator");

dotenv.config();
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

exports.getRegister = (req, res, next) => {
  res.render("auth/register", {
    path: "/register",
    pageTitle: "Register",
    inputData: {
      name: null,
      email: null,
      password: null,
      confirmPassword: null,
    },
    errorMessage: req.flash("error"),
    validationErrors: [],
  });
};

exports.postRegister = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/register", {
      path: "/register",
      pageTitle: "Register",
      inputData: {
        name: name,
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array().map((e) => e.path),
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashPassword) => {
      const user = new User({
        name: name,
        email: email,
        password: hashPassword,
        cart: { items: [] },
      });
      user
        .save()
        .then((result) => {
          const mailOptions = {
            from: EMAIL_USER,
            to: email,
            subject: "Signup succeeded.",
            html: "<h1>You have successfully signed up!</h1>",
          };
          transporter
            .sendMail(mailOptions)
            .then((info) => {
              console.log("Email sent: " + info.response);
              console.log("Created User");
              req.flash("success", "New user has been created.");
              res.redirect("/login");
            })
            .catch((err) => {
              const error = new Error(err);
              error.httpStatusCode = 500;
              console.log("🚀 ~ Send Email to User", error);
              return next(error);
            });
        })
        .catch((err) => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          console.log("🚀 ~ Add User", error);
          return next(error);
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Hashing Password", error);
      return next(error);
    });
};

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    inputData: {
      email: null,
      password: null,
    },
    errorMessage: req.flash("error"),
    successMessage: req.flash("success"),
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      successMessage: req.flash("success"),
      inputData: {
        email: email,
        password: password,
      },
      validationErrors: errors.array().map((e) => e.path),
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Please enter a valid credentials & try again!");
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: req.flash("error"),
          successMessage: req.flash("success"),
          inputData: {
            email: email,
            password: password,
          },
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((error) => {
              if (error) console.log("Save Session Error:", error);
              res.redirect("/");
            });
          }
          req.flash("error", "Please enter a valid credentials & try again!");
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: req.flash("error"),
            successMessage: req.flash("success"),
            inputData: {
              email: email,
              password: password,
            },
          });
        })
        .catch((err) => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          console.log("🚀 ~ Comparing Password", error);
          return next(error);
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ Find User", error);
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log("Destroy Session Error:", err);
    res.redirect("/");
  });
};
