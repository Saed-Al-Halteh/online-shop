const bcrypt = require("bcryptjs");
const User = require("../models/user");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator/check");
const nodeMailer = require("nodemailer");

const transporter = nodeMailer.createTransport({
  service: "hotmail",
  auth: {
    user: "saed_jm_@hotmail.com",
    pass: "halteh.27",
  },
});
const sendEmail = (options) => {
  transporter.sendMail(options, (err, info) => {
    if (err) {
      console.log("Error sending email : ", err);
      return;
    }
    console.log("Signup mail sent successfully");
  });
};

exports.getLogin = (req, res, next) => {
  let message = req.flash("error"); // returns an array
  if (message.length) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {},
    validationErrors: [],
  });
};

exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;

  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: validationErrors.array()[0].msg,
      oldInput: { email, password },
      validationErrors: validationErrors.array(),
    });
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    // req.flash("error", "Email doesn't exsists");
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: "Email doesn't exsists",
      oldInput: { email, password },
      validationErrors: [{ param: "email" }],
    });
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: "Invalid password",
      oldInput: { email, password },
      validationErrors: [{ param: "password" }],
    });
  }
  // email and password match a record, create a session for that user.
  req.session.user = user.toJSON();
  req.session.isLoggedIn = true;
  // req.session.save() -> make sure data stored in teh session(in our database) before redirecting to the home page,
  // so we enusre that the session data is available to the session middleware for the redirect request.
  req.session.save((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
};

exports.postLogout = async (req, res, next) => {
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.redirect("/");
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error"); // returns an array
  if (message.length) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {},
    validationErrors: [],
  });
};

exports.postSignup = async (req, res, next) => {
  //1) extract data from the request.
  const { email, password, confirmPassword } = req.body;
  //2) validate the inputs and the email doesn't already exists
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    console.log(validationErrors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: validationErrors.array()[0].msg,
      oldInput: { email, password, confirmPassword },
      validationErrors: validationErrors.array(),
    });
  }

  // if no user with this email found, create a new user and save it in our db.
  // hash the bassword.
  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await User.create({ email: email, password: hashedPassword });
  // create cart for that user.
  const newUserCart = await newUser.createCart();

  //sending signup mail confirmation
  sendEmail({
    from: "saed_jm_@hotmail.com",
    to: email,
    subject: "Shop SignUp completed",
    text: "Congratulations your signup completed successfully",
    // html: "<h2> Congratulations your signup completed successfully </h2> "
  });

  return res.redirect("/login");
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error"); // returns an array
  if (message.length) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = async (req, res, next) => {
  // check if email exsists
  const user = await User.findOne({ where: { email: req.body.email } });

  if (!user) {
    req.flash("error", "No Account with that Email found");
    return res.redirect("/reset");
  }

  // if it exsists
  // generate the token that will vaildate that the user is resetting the password from our link
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log("error generating reset token");
      req.flash("error", "Ooops something went wrong");
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");

    // save the token in the database with an expiration data so it can be checked later
    await user.update({
      resetToken: token,
      resetTokenExpiration: new Date(new Date().getTime() + 60 * 60 * 1000),
    });
    // send email
    sendEmail({
      from: "saed_jm_@hotmail.com",
      to: req.body.email,
      subject: "Shop Reset Password",
      text: "Congratulations your signup completed successfully",
      html: `
      <p> You Requested a password rest </p>
      <p> Click this <a href="http://localhost:3000/reset/${token}"> link </a> to set a new password </p> 
      `,
    });

    return res.redirect("/");
  });
};

exports.getNewPassword = async (req, res, next) => {
  const { token } = req.params;
  const user = await User.findOne({
    where: {
      resetToken: token,
      resetTokenExpiration: { [Op.gt]: new Date() },
    },
  });
  if (!user) {
    req.flash("error", "Token expired");
    return res.redirect("/reset");
  }

  let message = req.flash("error"); // returns an array
  if (message.length) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/new-password", {
    path: "/new-password",
    pageTitle: "New Password",
    errorMessage: message,
    userId: user.id,
    passwordToken: token,
  });
};

exports.postNewPassword = async (req, res, next) => {
  const { password, userId, passwordToken } = req.body;

  const user = await User.findOne({
    where: {
      id: userId,
      resetToken: passwordToken,
      resetTokenExpiration: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    req.flash("error", "Something went wrong");
    return res.redirect("/reset");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await user.update({
    password: hashedPassword,
    resetToken: undefined,
    resetTokenExpiration: undefined,
  });

  return res.redirect("/login");
};
