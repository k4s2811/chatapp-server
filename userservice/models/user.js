// docker exec -it mongodb mongosh

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    avatar: {
      type: String,
      default: "",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    refreshToken: {
      type: String,
      select: false,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);


// Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("passwordHash")) return next();

//   const salt = await bcrypt.genSalt(12);
//   this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
//   next();
// });


// Compare password method
// userSchema.methods.comparePassword = async function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.passwordHash);
// };


// Remove sensitive fields when converting to JSON
// userSchema.methods.toJSON = function () {
//   const user = this.toObject();
//   delete user.passwordHash;
//   delete user.refreshToken;
//   return user;
// };


export const User = mongoose.model("User", userSchema);