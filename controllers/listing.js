const Listing = require("../models/listing");
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const axios = require('axios');

module.exports.homePage = (req, res) => {
    res.redirect("/listings");
}

module.exports.index = async (req, res) => {
    const allListing = await Listing.find({});
    res.render("listings/index.ejs", { allListing });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            },
        }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    try {
        
        const { title, location, price, country, description } = req.body.listing;

        let url = req.file?.path || "https://via.placeholder.com/400";
        let filename = req.file?.filename || "default";

        const geoResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: location, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'WanderlustApp/1.0' }
        });

        const coordinates = geoResponse.data.length
            ? {
                lat: parseFloat(geoResponse.data[0].lat),
                lng: parseFloat(geoResponse.data[0].lon)
            }
            : { lat: 0, lng: 0 }; // fallback

        const newListing = new Listing({
            title,
            description,
            price,
            country,
            location,
            coordinates,
            owner: req.user._id,
            image: { url, filename }
        });

        await newListing.save();

        req.flash("success", "New Listing Added!");
        res.redirect(`/listings/${newListing._id}`);
    } catch (err) {
        next(err);
    }
};


module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    let originalListingUrl = listing.image.url.replace("/upload", "/upload/h_300,w_250")
    res.render("listings/edit.ejs", { listing, originalListingUrl });
};

module.exports.updateListing = async (req, res) => {
    const { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings")
};



