import mongoose from "mongoose";
import validator from "validator";

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
    validate: [validator.isEmail, "Please enter valid email address"],
  }, 
  google: {
    access_token: { type: String },
    refresh_token: { type: String },
    scope: { type: String },
    token_type: { type: String },
    expiry_date: { type: Number }, // or Date, but Google returns it as timestamp
  },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
