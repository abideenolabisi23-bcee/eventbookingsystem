const UserModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const cloudinary = require("../config/cloudinary");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_PASS
  }
});

const registerUser = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      password
    } = req.body;

    if (
      !firstname ||
      !lastname ||
      !email ||
      !password
    ) {
      return res.status(400).send({
        message: "All fields are required"
      });
    }

    const nameRegex =
      /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

    if (!nameRegex.test(firstname.trim())) {
      return res.status(400).send({
        message:
          "First name can only contain letters"
      });
    }

    if (!nameRegex.test(lastname.trim())) {
      return res.status(400).send({
        message:
          "Last name can only contain letters"
      });
    }

    if (
      firstname.trim().length < 2 ||
      lastname.trim().length < 2
    ) {
      return res.status(400).send({
        message:
          "First name and last name must contain at least 2 letters"
      });
    }

    const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email.trim())) {
  return res.status(400).send({
    message: "Please enter a valid email address"
  });
}

    if (password.length < 8) {
      return res.status(400).send({
        message:
          "Password must be at least 8 characters"
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await UserModel.findOne({
        email: normalizedEmail
      });

    if (existingUser) {
      return res.status(400).send({
        message: "User already exists"
      });
    }

    const saltround =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        saltround
      );

    const user =
      await UserModel.create({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: normalizedEmail,
        password: hashedPassword
      });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7h"
      }
    );

    return res.status(201).send({
      message:
        "User created successfully",
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.log(error);

    if (error.code === 11000) {
      return res.status(400).send({
        message: "User already exists"
      });
    }

    return res.status(400).send({
      message:
        "User cannot be created at this time"
    });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const isUser = await UserModel
      .findOne({
        email: normalizedEmail
      })
      .select("+password");

    if (!isUser) {
      return res.status(400).send({
        message: "Email address is incorrect"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      isUser.password
    );

    if (!isMatch) {
      return res.status(400).send({
        message: "Password is incorrect"
      });
    }

    if (isUser.accountStatus === "suspended") {
      return res.status(403).send({
        message: "Your account has been suspended"
      });
    }

    const accessToken = jwt.sign(
      {
        id: isUser._id,
        role: isUser.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h"
      }
    );

    const refreshToken = jwt.sign(
      {
        id: isUser._id,
        role: isUser.role
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "7d"
      }
    );

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    isUser.refreshTokenHash = refreshTokenHash;

    await isUser.save();

    return res.status(200).send({
      message: "Login successful",
      data: {
        firstname: isUser.firstname,
        lastname: isUser.lastname,
        email: isUser.email,
        role: isUser.role,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);

    return res.status(500).send({
      message: "Something went wrong"
    });
  }
};

const verifyUser = async (req, res, next) => {
  try {
    const authorization = req.headers["authorization"];

    if (!authorization) {
      return res.status(401).send({
        message: "User unauthorized!"
      });
    }

    const token = authorization.split(" ")[1]
      ? authorization.split(" ")[1]
      : authorization.split(" ")[0];

    // VERIFY ACCESS TOKEN
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // CHECK IF USER STILL EXISTS
    const currentUser = await UserModel.findById(
      decoded.id
    );

    if (!currentUser) {
      return res.status(401).send({
        message: "User not found"
      });
    }

    // CHECK IF ADMIN HAS SUSPENDED USER
    if (currentUser.accountStatus === "suspended") {
      return res.status(403).send({
        message: "Your account has been suspended"
      });
    }

    // KEEP ID AND ROLE AVAILABLE TO OTHER CONTROLLERS
    req.user = {
      id: currentUser._id.toString(),
      role: currentUser.role
    };

    next();

  } catch (error) {
    console.log("VERIFY USER ERROR:", error);

    return res.status(401).send({
      message: "Invalid or expired token"
    });
  }
};


const getUsers = async (req, res) => {
  try {

    const users = await UserModel
      .find()
      .select("-password");


    return res.status(200).send({
      message: "Users retrieved successfully",
      data: users
    });

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot retrieve users"
    });
  }
};


const getCurrentUser = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await UserModel
      .findById(id)
      .select("-password");


    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }


    return res.status(200).send({
      message: "User information retrieved successfully",
      data: user
    });

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot retrieve user information"
    });
  }
};

const registerOrganizer = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      password,
      businessName,
      phone
    } = req.body;

    if (
      !firstname ||
      !lastname ||
      !email ||
      !password ||
      !businessName ||
      !phone
    ) {
      return res.status(400).send({
        message: "All fields are required"
      });
    }

    const nameRegex =
      /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

    if (!nameRegex.test(firstname.trim())) {
      return res.status(400).send({
        message:
          "First name can only contain letters"
      });
    }

    if (!nameRegex.test(lastname.trim())) {
      return res.status(400).send({
        message:
          "Last name can only contain letters"
      });
    }

    if (
      firstname.trim().length < 2 ||
      lastname.trim().length < 2
    ) {
      return res.status(400).send({
        message:
          "First name and last name must contain at least 2 letters"
      });
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).send({
        message:
          "Please enter a valid email address"
      });
    }

    const phoneRegex =
      /^(?:\+234|234|0)[789][01]\d{8}$/;

    const normalizedPhone =
      phone.replace(/\s/g, "");

    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).send({
        message:
          "Please enter a valid Nigerian phone number"
      });
    }

    if (businessName.trim().length < 2) {
      return res.status(400).send({
        message:
          "Business name must contain at least 2 characters"
      });
    }

    if (password.length < 8) {
      return res.status(400).send({
        message:
          "Password must be at least 8 characters"
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await UserModel.findOne({
        email: normalizedEmail
      });

    if (existingUser) {
      return res.status(400).send({
        message: "Account already exists"
      });
    }

    const saltround =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        saltround
      );

    const organizer =
      await UserModel.create({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        businessName:
          businessName.trim(),
        phone: normalizedPhone,
        role: "organizer",
        approvalStatus: "pending"
      });

    return res.status(201).send({
      message:
        "Organizer registration successful. Awaiting admin approval.",
      data: {
        id: organizer._id,
        firstname:
          organizer.firstname,
        lastname:
          organizer.lastname,
        email: organizer.email,
        businessName:
          organizer.businessName,
        phone: organizer.phone,
        role: organizer.role,
        approvalStatus:
          organizer.approvalStatus
      }
    });
  } catch (error) {
    console.log(
      "REGISTER ORGANIZER ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).send({
        message: "Account already exists"
      });
    }

    return res.status(400).send({
      message:
        "Organizer cannot be created at this time"
    });
  }
};

const registerFoodVendor = async (req, res) => {
  try {

    const {
      firstname,
      lastname,
      email,
      password,
      businessName,
      phone
    } = req.body;


    // CHECK REQUIRED FIELDS
    if (
      !firstname ||
      !lastname ||
      !email ||
      !password ||
      !businessName ||
      !phone
    ) {
      return res.status(400).send({
        message: "All fields are required"
      });
    }


    // CHECK IF ACCOUNT ALREADY EXISTS
    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res.status(400).send({
        message: "Account already exists"
      });
    }


    // HASH PASSWORD
    const saltround = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(
      password,
      saltround
    );


    // CREATE FOOD VENDOR APPLICATION
    const foodVendor = await UserModel.create({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      businessName,
      phone,
      role: "food_vendor",
      approvalStatus: "pending"
    });


    return res.status(201).send({
      message: "Food vendor registration successful. Awaiting admin approval.",

      data: {
        id: foodVendor._id,
        firstname: foodVendor.firstname,
        lastname: foodVendor.lastname,
        email: foodVendor.email,
        businessName: foodVendor.businessName,
        phone: foodVendor.phone,
        role: foodVendor.role,
        approvalStatus: foodVendor.approvalStatus
      }
    });

  } catch (error) {

    console.log(error);

    if (error.code === 11000) {
      return res.status(400).send({
        message: "Account already exists"
      });
    }

    return res.status(400).send({
      message: "Food vendor cannot be created at this time"
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id, role } = req.user;

    const {
      firstname,
      lastname,
      phone,
      businessName
    } = req.body;

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    if (firstname !== undefined) {
      user.firstname = firstname;
    }

    if (lastname !== undefined) {
      user.lastname = lastname;
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (role === "organizer" && businessName !== undefined) {
      user.businessName = businessName;
    }

    await user.save();

    return res.status(200).send({
      message: "Profile updated successfully",
      data: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        businessName: user.businessName,
        profilePicture: user.profilePicture,
        role: user.role,
        approvalStatus: user.approvalStatus,
        accountStatus: user.accountStatus
      }
    });
  } catch (error) {
    console.log("UPDATE USER ERROR:", error);

    return res.status(500).send({
      message: "User cannot be updated at this time"
    });
  }
};

const isOrganizer = (req, res, next) => {
  const { role } = req.user;

  if (role !== "organizer") {
    return res.status(403).send({
      message: "Organizer access only"
    });
  }

  next();
};

const isAdmin = (req, res, next) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).send({
        message: "Admin access only"
      });
    }

    next();

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot verify admin access"
    });
  }
};

const isApprovedProvider = async (req, res, next) => {
  try {

    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }


    // ONLY ORGANIZERS AND FOOD VENDORS REQUIRE APPROVAL
    if (
      user.role === "organizer" ||
      user.role === "food_vendor"
    ) {

      if (user.approvalStatus !== "approved") {
        return res.status(403).send({
          message: "Your account has not been approved by admin"
        });
      }

    }


    next();

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot verify account approval"
    });
  }
};

const getUserByOrganizer = async (req, res) => {
  try {

    const { role } = req.user;
    const { userId } = req.params;


    // CHECK IF LOGGED-IN PERSON IS ORGANIZER OR ADMIN
    if (role !== "organizer" && role !== "admin") {
      return res.status(403).send({
        message: "Forbidden resource"
      });
    }


    // FIND USER
    const user = await UserModel
      .findById(userId)
      .select("-password");


    // CHECK IF USER EXISTS
    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }


    return res.status(200).send({
      message: "User information fetched successfully",
      data: user
    });

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch user information"
    });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).send({
        message: "Email is required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await UserModel.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(404).send({
        message: "Email address is incorrect"
      });
    }

    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;

    user.resetPasswordExpires =
      Date.now() + 15 * 60 * 1000;

    await user.save();

    let resetPath = "/reset-password";

    if (user.role === "admin") {
      resetPath = "/admin/reset-password";
    }

    if (user.role === "organizer") {
      resetPath = "/organizer/reset-password";
    }

    if (user.role === "food_vendor") {
      resetPath = "/food-vendor/reset-password";
    }

    if (user.role === "staff") {
      resetPath = "/staff/reset-password";
    }

    const resetLink =
      `http://localhost:5173${resetPath}/${resetToken}`;

    const mailOptions = {
      from: process.env.APP_EMAIL,
      to: user.email,
      subject: "Reset Your Vibely Password",
      text: `Hello ${user.firstname},

You requested to reset your Vibely password.

Click the link below to create a new password:

${resetLink}

This link will expire in 15 minutes.

If you did not request a password reset, you can ignore this email.`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).send({
      message: "Password reset link sent to your email"
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot process password reset at this time"
    });
  }
};


const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  try {
    if (!token) {
      return res.status(400).send({
        message: "Reset token is required"
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).send({
        message: "Password and confirm password are required"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).send({
        message: "Passwords do not match"
      });
    }

    if (password.length < 8) {
      return res.status(400).send({
        message: "Password must be at least 8 characters"
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    });

    if (!user) {
      return res.status(400).send({
        message: "Reset link is invalid or has expired"
      });
    }

    const saltRound = await bcrypt.genSalt(10);

    const hashPass = await bcrypt.hash(
      password,
      saltRound
    );

    user.password = hashPass;

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshTokenHash = null;

    await user.save();

    return res.status(200).send({
      message: "Password reset successfully",
      data: {
        role: user.role
      }
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot reset password at this time"
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {

    const { refreshToken } = req.body;

    // CHECK IF REFRESH TOKEN WAS PROVIDED
    if (!refreshToken) {
      return res.status(401).send({
        message: "Refresh token is required"
      });
    }


    // VERIFY REFRESH TOKEN
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );


    // HASH THE REFRESH TOKEN
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");


    // FIND USER WITH THIS REFRESH TOKEN
    const user = await UserModel
      .findOne({
        _id: decoded.id,
        refreshTokenHash: refreshTokenHash
      })
      .select("+refreshTokenHash");


    if (!user) {
      return res.status(401).send({
        message: "Invalid refresh token"
      });
    }

    if (user.accountStatus === "suspended") {
  return res.status(403).send({
    message: "Your account has been suspended"
  });
}


    // CREATE A NEW ACCESS TOKEN
    const newAccessToken = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h"
      }
    );


    return res.status(200).send({
      message: "New access token generated successfully",

      data: {
        accessToken: newAccessToken
      }
    });

  } catch (error) {

    console.log(error);

    return res.status(401).send({
      message: "Invalid or expired refresh token"
    });
  }
};

const getPendingApplications = async (req, res) => {
  try {

    const applications = await UserModel.find({
      role: {
        $in: ["organizer", "food_vendor"]
      },
      approvalStatus: "pending"
    }).select("-password -refreshTokenHash");


    return res.status(200).send({
      message: "Pending applications fetched successfully",
      data: applications
    });

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch pending applications at this time"
    });
  }
};

const reviewApplication = async (req, res) => {
  try {

    const { userId } = req.params;
    const { action } = req.body;


    // CHECK ACTION
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).send({
        message: "Action must be either approve or reject"
      });
    }


    // FIND APPLICANT
    const applicant = await UserModel.findById(userId);

    if (!applicant) {
      return res.status(404).send({
        message: "Application not found"
      });
    }


    // ONLY ORGANIZERS AND FOOD VENDORS NEED APPROVAL
    if (
      applicant.role !== "organizer" &&
      applicant.role !== "food_vendor"
    ) {
      return res.status(400).send({
        message: "This account does not require approval"
      });
    }


    // CHECK IF APPLICATION HAS ALREADY BEEN REVIEWED
    if (applicant.approvalStatus !== "pending") {
      return res.status(400).send({
        message: "Application has already been reviewed"
      });
    }


    // APPROVE OR REJECT
    if (action === "approve") {
      applicant.approvalStatus = "approved";
    } else {
      applicant.approvalStatus = "rejected";
    }


    await applicant.save();


    return res.status(200).send({
      message:
        action === "approve"
          ? "Application approved successfully"
          : "Application rejected successfully",

      data: {
        id: applicant._id,
        firstname: applicant.firstname,
        lastname: applicant.lastname,
        email: applicant.email,
        businessName: applicant.businessName,
        phone: applicant.phone,
        role: applicant.role,
        approvalStatus: applicant.approvalStatus
      }
    });

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot review application at this time"
    });
  }
};

const isFoodVendor = (req, res, next) => {
  try {
    const { role } = req.user;

    if (
      role !== "food_vendor" &&
      role !== "organizer"
    ) {
      return res.status(403).send({
        message: "Food management access only"
      });
    }

    next();
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot verify food management access"
    });
  }
};

const logoutUser = async (req, res) => {
  try {

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).send({
        message: "Refresh token is required"
      });
    }


    // HASH THE REFRESH TOKEN
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");


    // FIND USER THAT OWNS THIS REFRESH TOKEN
    const user = await UserModel
      .findOne({
        refreshTokenHash: refreshTokenHash
      })
      .select("+refreshTokenHash");


    if (!user) {
      return res.status(200).send({
        message: "Logout successful"
      });
    }


    // REMOVE REFRESH TOKEN FROM DATABASE
    user.refreshTokenHash = null;

    await user.save();


    return res.status(200).send({
      message: "Logout successful"
    });

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message: "Cannot logout at this time"
    });
  }
};

const changePassword = async (req, res) => {
  const { id } = req.user;
  const {
    currentPassword,
    newPassword,
    confirmPassword
  } = req.body;

  try {
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).send({
        message: "All password fields are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send({
        message: "New passwords do not match"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).send({
        message:
          "New password must be at least 8 characters"
      });
    }

    const user = await UserModel.findById(id)
      .select("+password +refreshTokenHash");

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    const passwordIsCorrect =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!passwordIsCorrect) {
      return res.status(400).send({
        message: "Current password is incorrect"
      });
    }

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (samePassword) {
      return res.status(400).send({
        message:
          "New password must be different from your current password"
      });
    }

    const saltRound = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(
      newPassword,
      saltRound
    );

    user.password = hashedPassword;
    user.refreshTokenHash = null;

    await user.save();

    return res.status(200).send({
      message:
        "Password changed successfully. Please log in again."
    });
  } catch (error) {
    console.log("CHANGE PASSWORD ERROR:", error);

    return res.status(500).send({
      message:
        "Cannot change password at this time"
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  const { id } = req.user;

  console.log("PROFILE PICTURE ROUTE REACHED");
  console.log("FILE RECEIVED:", req.file);

  try {
    if (!req.file) {
      return res.status(400).send({
        message: "Please select a profile picture"
      });
    }

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    const result = await new Promise(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder: "vibely/profile-pictures",
              resource_type: "image"
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

        uploadStream.end(req.file.buffer);
      }
    );

    console.log(
      "CLOUDINARY UPLOAD SUCCESS:",
      result.secure_url
    );

    user.profilePicture = result.secure_url;

    await user.save();

    return res.status(200).send({
      message:
        "Profile picture updated successfully",
      data: {
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.log(
      "PROFILE PICTURE UPLOAD ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot upload profile picture at this time",
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  registerOrganizer,
  registerFoodVendor,
  loginUser,
  verifyUser,
  isOrganizer,
  isAdmin,
  isApprovedProvider,
  getUsers,
  getCurrentUser,
  updateUser,
  getUserByOrganizer,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  getPendingApplications,
  reviewApplication,
  isFoodVendor,
  logoutUser,
  changePassword,
  uploadProfilePicture
};