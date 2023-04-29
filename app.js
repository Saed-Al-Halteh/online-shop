const path = require("path");

const { v4: uuidv4 } = require("uuid");
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
// initalize sequelize with session store
const SequelizeStore = require("connect-session-sequelize")(session.Store);

const errorController = require("./controllers/error");
const sequelize = require("./util/database");

const Product = require("./models/product");
const User = require("./models/user");
const Cart = require("./models/cart");
const CartItem = require("./models/cart-item");
const Order = require("./models/order");
const OrderItem = require("./models/order-item");

const app = express();

const csrfProtection = csrf();

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

app.use(bodyParser.urlencoded({ extended: false }));

const multerFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "_" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const acceptedTypes = ["image/png", "image/jpg", "image/jpeg"];
  acceptedTypes.includes(file.mimetype) ? cb(null, true) : cb(null, false);
};

app.use(multer({ storage: multerFileStorage, fileFilter }).single("image"));

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

// session store in mysql database by sequelize
const mySessionStore = new SequelizeStore({
  db: sequelize,
});

app.use(
  session({
    secret: "my secret",
    store: mySessionStore,
    resave: false,
    saveUninitialized: false,
    // cookie: { maxAge: 3600 },
  })
);
// must come after the middleware that initalized the middleware
app.use(csrfProtection);

// flash initalize must come after the middleware that initalized the middleware
app.use(flash());

app.use((req, res, next) => {
  // res.locals allow us to set local variable that will be sent to our views.
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use(async (req, res, next) => {
  const { user: userData } = req.session;

  if (!userData) {
    return next();
  }

  let user;
  try {
    user = await User.findByPk(userData.id);
    // this will not throw an error if no user found, it will jst return undefined
    if (!user) {
      // do not set req.user if no user found
      return next();
    }
  } catch (err) {
    next(err); // since it is a async function, calling next(error) will move the request to the errorHandler middleware.
    // if we used throw Error inside an async function without handling it properly in a catch block, it will crash the application and will not move to the errorHandler middlewre
    // throw new Error(err);
  }

  req.user = user;
  next();
});

app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use(shopRoutes);

app.get("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  // if (error.httpStatusCode === 500) {
  // res.status(500).redirect("/500");
  res.status(500).render("500", {
    pageTitle: "Error",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
  // }
});
// relate models before syncing the models
// One-To-Many
Product.belongsTo(User, { constraints: true, onDelete: "CASCADE" });
User.hasMany(Product);
// One-To-One
User.hasOne(Cart);
Cart.belongsTo(User);
// Many-To-Many
Cart.belongsToMany(Product, { through: CartItem });
Product.belongsToMany(Cart, { through: CartItem });
// One-To-Many
Order.belongsTo(User);
User.hasMany(Order);
// Many-To-Many
Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });

(async () => {
  try {
    await sequelize.sync();
    await mySessionStore.sync({ force: true });

    app.listen(3000);
  } catch (err) {
    console.log(err);
  }
})();
