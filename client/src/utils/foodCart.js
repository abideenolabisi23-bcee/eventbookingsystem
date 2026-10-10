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

export const addFoodToCart = (food, quantity = 1) => {
  const cart = getFoodCart();

  const rawFoodId = food?._id || food?.id;
  const amount = Number(quantity);
  const price = Number(food?.price);

  if (
    !rawFoodId ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return false;
  }

  const foodId = String(rawFoodId);

  const vendor = food.vendor || food.createdBy;

  const vendorId = String(
    vendor?._id || vendor || ""
  );

  if (!vendorId || vendorId === "[object Object]") {
    return false;
  }

  const differentVendor = cart.some(
    (item) => String(item.vendorId) !== vendorId
  );

  if (differentVendor) {
    return false;
  }

  const existingItem = cart.find(
    (item) => String(item.foodId) === foodId
  );

  const availableQuantity = Number(food.quantity);

  if (
    Number.isFinite(availableQuantity) &&
    existingItem?.quantity + amount > availableQuantity
  ) {
    return false;
  }

  if (
    Number.isFinite(availableQuantity) &&
    !existingItem &&
    amount > availableQuantity
  ) {
    return false;
  }

  if (existingItem) {
    existingItem.quantity += amount;
  } else {
    cart.push({
      foodId,
      name: food.name,
      image: food.image || food.imageUrl || "",
      price,
      quantity: amount,
      vendorId,
      availableQuantity: Number.isFinite(availableQuantity)
        ? availableQuantity
        : null
    });
  }

  saveFoodCart(cart);

  return true;
};

export const updateFoodCartQuantity = (
  foodId,
  quantity
) => {
  const amount = Number(quantity);

  if (!Number.isInteger(amount) || amount < 0) {
    return false;
  }

  const cart = getFoodCart();

  const existingItem = cart.find(
    (item) => String(item.foodId) === String(foodId)
  );

  if (!existingItem) {
    return false;
  }

  if (
    amount > 0 &&
    existingItem.availableQuantity !== null &&
    existingItem.availableQuantity !== undefined &&
    amount > Number(existingItem.availableQuantity)
  ) {
    return false;
  }

  const updatedCart = cart
    .map((item) =>
      String(item.foodId) === String(foodId)
        ? { ...item, quantity: amount }
        : item
    )
    .filter((item) => item.quantity > 0);

  saveFoodCart(updatedCart);

  return true;
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

export const getFoodCartTotal = () => {
  return getFoodCart().reduce(
    (total, item) =>
      total +
      Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
};

export const getFoodCartCount = () => {
  return getFoodCart().reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
};