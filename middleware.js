const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");

module.exports.isLoggedin = (req,res,next)=>{
     if(!req.isAuthenticated()){
            req.session.redirectUrl = req.originalUrl;
            req.flash("error","Logged in first...")
            return res.redirect("/login");
        }
        next();
}
module.exports.saveRedirectUrl = (req,res,next)=>{
    res.locals.redirectUrl = req.session.redirectUrl;
    next();
}

module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You do not have permission!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};


module.exports.isReviewAuthor = async(req,res,next)=>{
    let { id,reviewId } = req.params;
    let review = await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currUser._id)){
        req.flash("error","You are not the author of this review ..!");
        return res.redirect(`/listings/${id}`)
    }
    next();
}

module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        throw new ExpressError(400, error);
    }else{
        next();
    }
};

module.exports.formatListingImage = (req, res, next) => {
    // If a file was uploaded, set listing.image
    if (req.file) {
        req.body.listing.image = {
            url: req.file.path,       // Cloudinary or local path
            filename: req.file.filename
        };
    } else {
        // If no file uploaded during CREATE -> reject
        if (req.method === "POST") {
            req.flash("error", "Image file is required to create a listing!");
            return res.redirect("back");
        }

        // If EDIT and no new image uploaded -> keep old image
        if (req.method === "PUT" || req.method === "PATCH") {
            delete req.body.listing.image; 
        }
    }

    next();
};


module.exports.validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        throw new ExpressError(400, error);
    }else{
        next();
    }
};