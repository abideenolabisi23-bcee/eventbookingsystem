const FoodModel = require("../models/food.model");
const cloudinary = require("../config/cloudinary");


const createFood = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      quantity,
      category
    } = req.body;

    if (
      !name ||
      !description ||
      price === undefined ||
      quantity === undefined ||
      !category
    ) {
      return res.status(400).send({
        message: "Name, description, price, quantity and category are required"
      });
    }

    const foodPrice = Number(price);
    const foodQuantity = Number(quantity);

    if (!Number.isFinite(foodPrice) || foodPrice < 0) {
      return res.status(400).send({
        message: "Price must be a valid non-negative number"
      });
    }

    if (!Number.isInteger(foodQuantity) || foodQuantity < 0) {
      return res.status(400).send({
        message: "Quantity must be a valid non-negative whole number"
      });
    }

    const allowedCategories = FoodModel.schema.path("category").enumValues;

    if (!allowedCategories.includes(category)) {
      return res.status(400).send({
        message: "Please select a valid food category"
      });
    }

    let imageUrl = null;

    if (req.file) {
      const uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "vibely/foods",
            resource_type: "image"
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }

            resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      imageUrl = uploadedImage.secure_url;
    }

    const food = await FoodModel.create({
      name,
      description,
      price: foodPrice,
      quantity: foodQuantity,
      category,
      image: imageUrl,
      isAvailable: true,
      createdBy: req.user.id
    });

    return res.status(201).send({
      message: "Food created successfully",
      data: food
    });

  } catch (error) {
    console.error("CREATE FOOD ERROR:", error);

    return res.status(500).send({
      message: "Food cannot be created at this time"
    });
  }
};

const getFoods = async (req, res) => {
  try {

    /*
      IMPORTANT:

      We do NOT use:

      quantity: { $gt: 0 }

      because sold-out foods should
      still appear on the website.

      isAvailable false means the vendor
      intentionally removed the listing.
    */

    const foods = await FoodModel.find({
      isAvailable: true
    })
      .populate(
        "createdBy",
        "firstname lastname businessName"
      )
      .sort({
        createdAt: -1
      });


    return res.status(200).send({
      message:
        "Foods fetched successfully",

      data: foods
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message:
        "Cannot fetch foods at this time"
    });
  }
};

const getFoodById = async (req, res) => {
  try {

    const { id } = req.params;


    /*
      Do not check quantity here.

      A sold-out food should still
      have a details page.
    */

    const food = await FoodModel.findOne({
      _id: id,
      isAvailable: true
    }).populate(
      "createdBy",
      "firstname lastname businessName"
    );


    if (!food) {
      return res.status(404).send({
        message:
          "Food not found or unavailable"
      });
    }


    return res.status(200).send({
      message:
        "Food fetched successfully",

      data: food
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message:
        "Cannot fetch food at this time"
    });
  }
};

const getMyFoods = async (req, res) => {
  try {

    /*
      Vendor sees EVERYTHING they created,
      including:

      available foods
      sold-out foods
      disabled foods
    */

    const foods = await FoodModel.find({
      createdBy: req.user.id
    }).sort({
      createdAt: -1
    });


    return res.status(200).send({
      message:
        "Your foods fetched successfully",

      data: foods
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message:
        "Cannot fetch your foods at this time"
    });
  }
};

const updateFood = async (req, res) => {
  try {
    const { foodId } = req.params;

    const food = await FoodModel.findOne({
      _id: foodId,
      createdBy: req.user.id
    });

    if (!food) {
      return res.status(404).send({
        message: "Food not found or you are not authorized to update it"
      });
    }

    const {
      name,
      description,
      price,
      quantity,
      category
    } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).send({
          message: "Food name is required"
        });
      }

      food.name = name.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return res.status(400).send({
          message: "Food description is required"
        });
      }

      food.description = description.trim();
    }

    if (price !== undefined) {
      const foodPrice = Number(price);

      if (!Number.isFinite(foodPrice) || foodPrice < 0) {
        return res.status(400).send({
          message: "Price must be a valid non-negative number"
        });
      }

      food.price = foodPrice;
    }

    if (quantity !== undefined) {
      const foodQuantity = Number(quantity);

      if (
        !Number.isInteger(foodQuantity) ||
        foodQuantity < 0
      ) {
        return res.status(400).send({
          message: "Quantity must be a valid non-negative whole number"
        });
      }

      food.quantity = foodQuantity;
    }

    if (category !== undefined) {
      const allowedCategories =
        FoodModel.schema.path("category").enumValues;

      if (
        typeof category !== "string" ||
        !allowedCategories.includes(category)
      ) {
        return res.status(400).send({
          message: "Please select a valid food category"
        });
      }

      food.category = category;
    }

    let newImagePublicId = null;

    if (req.file) {
      const uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "vibely/foods",
            resource_type: "image"
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }

            resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      newImagePublicId = uploadedImage.public_id;
      food.image = uploadedImage.secure_url;
    }

    try {
      await food.save();
    } catch (error) {
      if (newImagePublicId) {
        try {
          await cloudinary.uploader.destroy(newImagePublicId);
        } catch (cleanupError) {
          console.error("IMAGE CLEANUP ERROR:", cleanupError);
        }
      }

      throw error;
    }

    return res.status(200).send({
      message: "Food updated successfully",
      data: food
    });

  } catch (error) {
    console.error("UPDATE FOOD ERROR:", error);

    if (error.name === "CastError") {
      return res.status(400).send({
        message: "Invalid food ID"
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).send({
        message: error.message
      });
    }

    return res.status(500).send({
      message: "Food cannot be updated at this time"
    });
  }
};


const toggleFoodAvailability = async (req, res) => {
  try {
    const { foodId } = req.params;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).send({
        message: "isAvailable must be true or false"
      });
    }

    const food = await FoodModel.findOne({
      _id: foodId,
      createdBy: req.user.id
    });

    if (!food) {
      return res.status(404).send({
        message: "Food not found or you are not authorized"
      });
    }

    food.isAvailable = isAvailable;

    await food.save();

    return res.status(200).send({
      message: food.isAvailable
        ? "Food enabled successfully"
        : "Food disabled successfully",
      data: food
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot change food availability at this time"
    });
  }
};



// =====================================
// DELETE FOOD
// FOOD VENDOR
// =====================================

const deleteFood = async (req, res) => {
  try {

    const { foodId } = req.params;


    const food =
      await FoodModel.findById(foodId);


    if (!food) {
      return res.status(404).send({
        message: "Food not found"
      });
    }


    // =====================================
    // CHECK OWNERSHIP
    // =====================================

    if (
      food.createdBy.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to delete this food"
      });
    }


    await FoodModel.findByIdAndDelete(
      foodId
    );


    return res.status(200).send({
      message:
        "Food deleted successfully"
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message:
        "Food cannot be deleted at this time"
    });
  }
};


// =====================================
// EXPORTS
// =====================================

module.exports = {
  createFood,
  getFoods,
  getFoodById,
  getMyFoods,
  updateFood,
  toggleFoodAvailability,
  deleteFood
};