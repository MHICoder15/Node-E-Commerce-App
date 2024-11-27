const express = require("express");
const { check, body } = require("express-validator");
const authController = require("../controllers/auth");
const User = require("../models/user");
const router = express.Router();

router.get("/register", authController.getRegister);
router.post(
  "/register",
  [
    check("name")
      .custom((value, { req }) => {
        if (!value) {
          throw new Error("Please enter a name field.");
        }
        return true;
      })
      .trim(),
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userData) => {
          if (userData) {
            return Promise.reject(
              "Email is already existed, please pick a different one."
            );
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      "please enter a password with only number and text and at least 8 to 15 characters."
    )
      .isLength({ min: 8, max: 15 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords does not matched.");
        }
        return true;
      })
      .trim(),
  ],
  authController.postRegister
);

router.get("/login", authController.getLogin);
router.post(
  "/login",
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email.")
    .normalizeEmail(),
  body("password", "Please enter a valid password.")
    .isLength({ min: 5, max: 10 })
    .isAlphanumeric()
    .trim(),
  authController.postLogin
);

router.post("/logout", authController.postLogout);

module.exports = router;
