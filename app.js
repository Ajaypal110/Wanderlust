if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const { title } = require("process");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema , reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const {isLoggedin,isOwner,isReviewAuthor,validateReview,validateListing,formatListingImage} = require("./middleware.js");
const {saveRedirectUrl} = require("./middleware.js");
const listingController = require("./controllers/listing.js");
const reviewController = require("./controllers/review.js");
const usersContoller = require("./controllers/users.js");

const multer  = require('multer')
const {storage} = require("./cloudconfig.js");
const upload = multer({ storage })

const axios = require("axios");
const cron = require("node-cron");

const dbUrl = process.env.ATLASDB_URL;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


console.log("DB URL =", dbUrl);


// -------------------- FIX MONGODB CONNECTION --------------------
async function connectDB() {
    try {
        await mongoose.connect(dbUrl, {
            serverSelectionTimeoutMS: 30000,
            tls: true
        });
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
    }
}
connectDB();

// -------------------- SESSION STORE --------------------
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter:24 * 3600,
});

store.on("error" , (err) =>{
    console.log("ERROR IN MONGO SESSION" , err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized : true,
    cookie:{
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge:7 * 24 * 60 * 60 * 1000,
        httpOnly : true,
    }
};

// -------------------- ROUTES --------------------

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) =>{
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    res.locals.currUser = req.user;
    next();
});

app.get("/", listingController.homePage);
app.get("/listings", wrapAsync(listingController.index));
app.get("/listings/new", isLoggedin,listingController.renderNewForm);
app.get("/listings/:id/edit",isLoggedin,isOwner, wrapAsync(listingController.renderEditForm));
app.get("/listings/:id", wrapAsync(listingController.showListing));
app.post("/listings",isLoggedin,upload.single("listing[image]"), formatListingImage, validateListing, wrapAsync(listingController.createListing));
app.put("/listings/:id",isLoggedin,isOwner,upload.single("listing[image]"),validateListing, wrapAsync(listingController.updateListing));
app.delete("/listings/:id", isLoggedin,isOwner,wrapAsync(listingController.deleteListing));
app.post("/listings/:id/reviews" ,isLoggedin,validateReview, wrapAsync(reviewController.addReview));
app.delete("/listings/:id/reviews/:reviewId",isLoggedin,isReviewAuthor,wrapAsync(reviewController.deleteReview));

app.get("/signup",(usersContoller.signupForm));
app.post("/signup", wrapAsync(usersContoller.newUser));
app.get("/login" ,usersContoller.loginForm);
app.post("/login" ,saveRedirectUrl, passport.authenticate("local",{failureRedirect:"/login",failureFlash:true}) ,usersContoller.loginUser);
app.get("/logout",usersContoller.logoutUser)

// -------------------- ERROR HANDLING --------------------
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!!!"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something Went Wrong!" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

// -------------------- KEEP ALIVE (FREE RENDER) --------------------
if (process.env.RENDER_EXTERNAL_URL) {
    const URL = process.env.RENDER_EXTERNAL_URL;
    cron.schedule("*/14 * * * *", async () => {
        try {
            await axios.get(URL);
            console.log("Keep-alive ping sent:", URL);
        } catch (err) {
            console.log("Keep-alive ping failed:", err.message);
        }
    });
}

// -------------------- SERVER LISTEN --------------------
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
