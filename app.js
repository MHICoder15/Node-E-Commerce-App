const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongodbStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const dotenv = require("dotenv");
const multer = require("multer");

const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const errorController = require("./controllers/error");
const isAuth = require("./middlewares/is-auth");

const User = require("./models/user");
const connectMongoDB = require("./utils/database.util").connectMongoDB;

const app = express();

// Dot Env Config
dotenv.config();
const PORT = process.env.PORT;
const MONGO_DB_URI = process.env.MONGO_DB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Mongo DB Session Store
const store = new MongodbStore({
  uri: MONGO_DB_URI,
  collection: "sessions",
});
const csrfProtection = csrf();

// Multer for File Storage
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now().toString() + "-" + file.originalname);
  },
});
const fileFilterCheck = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Middleware for body parser
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilterCheck }).single("image")
);

// Middleware for static file
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

// Middleware For Ejs Template
app.set("view engine", "ejs");
app.set("views", "views");

// Middleware For Session
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log("Find User By ID", err);
      next(new Error(err));
    });
});

// Middleware For Routes
app.use(shopRoutes);
app.use(authRoutes);

// Middleware For Generic Error
app.get("/500", isAuth, errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log("🚀 ~ General:", error);
  res.status(500).render("500", {
    pageTitle: "Server Error",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

connectMongoDB(() => {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
});
