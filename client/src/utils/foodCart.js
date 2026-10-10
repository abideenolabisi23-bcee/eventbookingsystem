
// const CART_KEY = "vibelyFoodCart";

// export const getFoodCart = () => {
//   try {
//     const savedCart = JSON.parse(
//       localStorage.getItem(CART_KEY) || "[]"
//     );

//     return Array.isArray(savedCart) ? savedCart : [];
//   } catch {
//     return [];
//   }
// };

// export const saveFoodCart = (items) => {
//   localStorage.setItem(
//     CART_KEY,
//     JSON.stringify(items)
//   );

//   window.dispatchEvent(new Event("vibely-cart-updated"));
// };

// export const addFoodToCart = (food, quantity = 1) => {
//   const cart = getFoodCart();

//   const foodId = String(food._id || food.id);
//   const amount = Number(quantity);

//   if (
//     !foodId ||
//     foodId === "undefined" ||
//     !Number.isInteger(amount) ||
//     amount < 1
//   ) {
//     return false;
//   }

//   const existingItem = cart.find(
//     (item) => item.foodId === foodId
//   );

//   if (existingItem) {
//     existingItem.quantity += amount;
//   } else {
//     cart.push({
//       foodId,
//       name: food.name,
//       image: food.image || food.imageUrl || "",
//       price: Number(food.price),
//       quantity: amount,
//       vendorId: food.vendor?._id || food.vendor || null
//     });
//   }

//   saveFoodCart(cart);
//   return true;
// };

// export const updateFoodCartQuantity = (
//   foodId,
//   quantity
// ) => {
//   const amount = Number(quantity);

//   if (!Number.isInteger(amount) || amount < 0) {
//     return;
//   }

//   const cart = getFoodCart();

//   const updatedCart = cart
//     .map((item) =>
//       item.foodId === String(foodId)
//         ? { ...item, quantity: amount }
//         : item
//     )
//     .filter((item) => item.quantity > 0);

//   saveFoodCart(updatedCart);
// };

// export const removeFoodFromCart = (foodId) => {
//   const updatedCart = getFoodCart().filter(
//     (item) => item.foodId !== String(foodId)
//   );

//   saveFoodCart(updatedCart);
// };

// export const clearFoodCart = () => {
//   saveFoodCart([]);
// };

// export const getFoodCartTotal = () => {
//   return getFoodCart().reduce(
//     (total, item) =>
//       total + item.price * item.quantity,
//     0
//   );
// };


const FOOD_CART_KEY = "vibelyFoodCart";

export const getFoodCart = () => {
  try {
    const cart = JSON.parse(
      localStorage.getItem(FOOD_CART_KEY) || "[]"
    );

    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
};

export const saveFoodCart = (cart) => {
  if (!Array.isArray(cart)) {
    return;
  }

  localStorage.setItem(
    FOOD_CART_KEY,
    JSON.stringify(cart)
  );

  window.dispatchEvent(
    new Event("vibely-cart-updated")
  );
};

export const removeFoodFromCart = (foodId) => {
  const updatedCart = getFoodCart().filter(
    (item) => String(item.foodId) !== String(foodId)
  );

  saveFoodCart(updatedCart);

  return updatedCart;
};

export const clearFoodCart = () => {
  saveFoodCart([]);
};
