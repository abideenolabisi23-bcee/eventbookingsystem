const FoodModel = require("../models/food.model");


// =====================================
// CREATE FOOD
// FOOD VENDOR
// =====================================

const createFood = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      quantity,
      category,
      image
    } = req.body;


    // =====================================
    // VALIDATE REQUIRED FIELDS
    // =====================================

    if (
      !name ||
      !description ||
      price === undefined ||
      quantity === undefined ||
      !category
    ) {
      return res.status(400).send({
        message:
          "Name, description, price, quantity and category are required"
      });
    }


    const foodPrice = Number(price);
    const foodQuantity = Number(quantity);


    // =====================================
    // VALIDATE PRICE
    // =====================================

    if (
      !Number.isFinite(foodPrice) ||
      foodPrice < 0
    ) {
      return res.status(400).send({
        message:
          "Price must be a valid positive number"
      });
    }


    // =====================================
    // VALIDATE QUANTITY
    // =====================================

    if (
      !Number.isInteger(foodQuantity) ||
      foodQuantity < 0
    ) {
      return res.status(400).send({
        message:
          "Quantity must be a valid whole number"
      });
    }


    // =====================================
    // CREATE FOOD
    // =====================================

    const food = await FoodModel.create({
      name,
      description,
      price: foodPrice,
      quantity: foodQuantity,
      category,
      image: image || null,

      /*
        Even if quantity is 0,
        keep it visible.

        Frontend will show SOLD OUT.
      */
      isAvailable: true,

      createdBy: req.user.id
    });


    return res.status(201).send({
      message:
        "Food created successfully",

      data: food
    });

  } catch (error) {
    console.log(error);

    return res.status(400).send({
      message:
        "Food cannot be created at this time"
    });
  }
};


// =====================================
// GET ALL FOODS
// PUBLIC
// =====================================

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


// =====================================
// GET ONE FOOD
// PUBLIC
// =====================================

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


// =====================================
// GET FOOD VENDOR'S FOODS
// =====================================

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


// =====================================
// UPDATE FOOD
// FOOD VENDOR
// =====================================

const updateFood = async (req, res) => {
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
          "You are not authorized to update this food"
      });
    }


    const {
      name,
      description,
      price,
      quantity,
      category,
      image
    } = req.body;


    // =====================================
    // UPDATE NAME
    // =====================================

    if (name !== undefined) {
      food.name = name;
    }


    // =====================================
    // UPDATE DESCRIPTION
    // =====================================

    if (description !== undefined) {
      food.description = description;
    }


    // =====================================
    // UPDATE PRICE
    // =====================================

    if (price !== undefined) {

      const foodPrice = Number(price);


      if (
        !Number.isFinite(foodPrice) ||
        foodPrice < 0
      ) {
        return res.status(400).send({
          message:
            "Price must be a valid positive number"
        });
      }


      food.price = foodPrice;
    }


    // =====================================
    // UPDATE QUANTITY
    // =====================================

    if (quantity !== undefined) {

      const foodQuantity =
        Number(quantity);


      if (
        !Number.isInteger(foodQuantity) ||
        foodQuantity < 0
      ) {
        return res.status(400).send({
          message:
            "Quantity must be a valid whole number"
        });
      }


      /*
        IMPORTANT:

        We ONLY update quantity here.

        We do NOT change isAvailable.

        Example:

        quantity = 0
        → SOLD OUT

        Later vendor changes:
        quantity = 50
        → orderable again
      */

      food.quantity = foodQuantity;
    }


    // =====================================
    // UPDATE CATEGORY
    // =====================================

    if (category !== undefined) {
      food.category = category;
    }


    // =====================================
    // UPDATE IMAGE
    // =====================================

    if (image !== undefined) {
      food.image = image;
    }


    await food.save();


    return res.status(200).send({
      message:
        "Food updated successfully",

      data: food
    });

  } catch (error) {
    console.log(error);

    return res.status(400).send({
      message:
        "Food cannot be updated at this time"
    });
  }
};


// =====================================
// ENABLE / DISABLE FOOD
// FOOD VENDOR
// =====================================

const toggleFoodAvailability = async (
  req,
  res
) => {
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
          "You are not authorized to manage this food"
      });
    }


    /*
      IMPORTANT:

      Vendor can enable food even if
      quantity is 0.

      It will simply show SOLD OUT
      to customers.
    */

    food.isAvailable =
      !food.isAvailable;


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
      message:
        "Cannot change food availability at this time"
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