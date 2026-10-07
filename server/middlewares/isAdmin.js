const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).send({
      message: "User unauthorized"
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).send({
      message: "Admin access only"
    });
  }

  next();
};

module.exports = isAdmin;