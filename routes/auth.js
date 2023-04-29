const express = require("express");
const { check, body } = require("express-validator/check");

const User = require("../models/user");

const authController = require("../controllers/auth");
const router = express.Router();

router.get("/login", authController.getLogin);
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please Enter a valid email value")
      .normalizeEmail(),
  ],
  authController.postLogin
);

router.post("/logout", authController.postLogout);

router.get("/signup", authController.getSignup);
router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please Enter a valid email value")
      .custom(async (value, { req }) => {
        const user = await User.findOne({ where: { email: value } });
        if (user) {
          throw new Error("Email already exsists!");
        }
        return true;
      })
      .normalizeEmail(),
    body(
      "password",
      "Password can only contain Alphabetic charecters and numbers and should be atleast of 5 chars"
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          console.log(value);
          console.log(req.body.password);

          throw new Error("Confirmed Password doesn't match");
        }
        return true;
      })
      .trim(),
  ],
  authController.postSignup
);

router.get("/reset", authController.getReset);
router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);
module.exports = router;
