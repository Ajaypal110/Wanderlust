const joi = require("joi");

module.exports.listingSchema = joi.object({
    listing:joi.object({
        title:joi.string().required(),
         description:joi.string().required(),
          image: joi.object({ url: joi.string().uri().required(),filename: joi.string().optional()}),
           price:joi.number().required().min(0),
            country:joi.string().required(),
            location:joi.string(),
    }).required(),
});               

module.exports.reviewSchema = joi.object({
    review: joi.object({
        rating: joi.number().max(5).default(2),
        comment: joi.string().required(),
    }).required(),
});


               