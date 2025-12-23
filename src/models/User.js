// src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const DEFAULT_SALT_ROUNDS = 12;
const resolveSaltRounds = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 16) {
    return parsed;
  }
  return DEFAULT_SALT_ROUNDS;
};

const SALT_ROUNDS = resolveSaltRounds(process.env.BCRYPT_SALT_ROUNDS);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // prevent returning password by default
    },
    role: {
      type: String,
      enum: ["coach", "client", "admin"],
      default: "client",
      required: true,
      index: true, // frequently used for filtering
    },
    
    // Platform subscription fields (for coaches only)
    platformSubscriptionStatus: {
      type: String,
      enum: ["trial", "active", "expired", "suspended"],
      default: null, // null for clients/admins, set to 'trial' for new coaches
    },
    trialEndsAt: {
      type: Date,
      default: null, // set to 28 days after coach registration
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null, // set after payment approval
    },
    
    phone: {
      type: String,
      trim: true,
      default: null,
      index: true, // search by phone if needed
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    address: {
      phoneNumber: { type: String, trim: true, default: null },
      line1: { type: String, trim: true, default: null },
      line2: { type: String, trim: true, default: null },
      neighborhood: { type: String, trim: true, default: null },
      city: { type: String, trim: true, default: null },
      state: { type: String, trim: true, default: null },
      postalCode: { type: String, trim: true, default: null },
      country: { type: String, trim: true, default: null },
    },

    avatarUrl: {
      type: String,
      trim: true,
      default: null,
    },
    avatarPublicId: {
      type: String,
      trim: true,
      default: null,
    },

    // Coach payment QR code (for UPI/manual QR payments)
    paymentQrUrl: {
      type: String,
      trim: true,
      default: null,
    },
    paymentQrPublicId: {
      type: String,
      trim: true,
      default: null,
    },

    // Coach-specific fields
    companyName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    specialization: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    // Social media links
    socialMedia: {
      instagram: { type: String, trim: true, default: null },
      facebook: { type: String, trim: true, default: null },
      twitter: { type: String, trim: true, default: null },
      linkedin: { type: String, trim: true, default: null },
      youtube: { type: String, trim: true, default: null },
      website: { type: String, trim: true, default: null },
    },
    // Coach gallery - awards and certifications
    awards: [{
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    // Coach gallery - transformation results
    transformations: [{
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    // Client-specific fields
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // reference coach
      index: true,
    },
    coachCode: {
      type: String,
      trim: true,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    
    // Progress tracking - Array-based history
    weightHistory: [{
      value: { type: Number, min: 0, max: 500 },
      date: { type: Date, default: Date.now }
    }],
    heightHistory: [{
      value: { type: Number, min: 0, max: 300 },
      date: { type: Date, default: Date.now }
    }],
    bmiHistory: [{
      value: { type: Number, min: 0, max: 100 },
      date: { type: Date, default: Date.now }
    }],
    notesHistory: [{
      text: { type: String, maxlength: 500 },
      date: { type: Date, default: Date.now }
    }],
    
    // Basic Info (non-tracking fields)
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", null],
      default: null,
    },
    
    // Smart Scale Measurements (tracking history)
    bodyFatPercentageHistory: [{
      value: { type: Number, min: 0, max: 100 },
      date: { type: Date, default: Date.now }
    }],
    visceralFatLevelHistory: [{
      value: { type: Number, min: 0, max: 50 },
      date: { type: Date, default: Date.now }
    }],
    muscleMassHistory: [{
      value: { type: Number, min: 0, max: 200 },
      date: { type: Date, default: Date.now }
    }],
    metabolicAgeHistory: [{
      value: { type: Number, min: 10, max: 120 },
      date: { type: Date, default: Date.now }
    }],
    bodyWaterPercentageHistory: [{
      value: { type: Number, min: 0, max: 100 },
      date: { type: Date, default: Date.now }
    }],
    boneMassHistory: [{
      value: { type: Number, min: 0, max: 20 },
      date: { type: Date, default: Date.now }
    }],
    
    // Lifestyle & Habits (non-tracking fields)
    dailyActivityLevel: {
      type: String,
      enum: ["None", "Sedentary", "Lightly active", "Moderately active", "Very active", "Highly active / athlete", null],
      default: null,
    },
    hydrationHabits: {
      type: String,
      enum: ["None", "< 1 liter/day", "1–2 liters/day", "2–3 liters/day", "> 3 liters/day", null],
      default: null,
    },
    dailyWaterGoal: {
      type: Number,
      min: 0,
      max: 20,
      default: 3.5,
    },
    goalWeight: {
      type: Number,
      min: 1,
      max: 500,
      default: null,
    },
    // Water intake tracking - stores last 7 days only
    waterIntakeLogs: [{
      date: {
        type: String, // Store as YYYY-MM-DD in IST
        required: true,
      },
      entries: [{
        amount: {
          type: Number,
          required: true,
          min: 0.01,
          max: 100,
        },
        time: {
          type: Date,
          required: true,
        },
        notes: {
          type: String,
          trim: true,
          maxlength: 500,
        }
      }],
      totalAmount: {
        type: Number,
        default: 0,
      }
    }],
    personalGoals: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    
    // Health History (non-tracking fields)
    healthConditions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    allergies: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    medications: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    pastWeightChanges: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    
    // Vitals (tracking history)
    bloodSugarFastingHistory: [{
      value: { type: Number, min: 0, max: 600 },
      date: { type: Date, default: Date.now }
    }],
    bloodSugarRandomHistory: [{
      value: { type: Number, min: 0, max: 600 },
      date: { type: Date, default: Date.now }
    }],
    bloodPressureSystolicHistory: [{
      value: { type: Number, min: 40, max: 250 },
      date: { type: Date, default: Date.now }
    }],
    bloodPressureDiastolicHistory: [{
      value: { type: Number, min: 20, max: 200 },
      date: { type: Date, default: Date.now }
    }],
    
    // For authentication and verification
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationOtpHash: String,
    emailVerificationOtpExpire: Date,
  },
  {
    timestamps: true, // adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ------------------------------
// 🔐 Password Hashing Middleware
// ------------------------------
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🧩 Auto-generate referral code for coaches
userSchema.pre("save", async function (next) {
  if (this.role === "coach" && !this.referralCode) {
    const prefix = (this.fullName || "").substring(0, 2).toUpperCase();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const candidate = `${prefix}-${randomCode}`;

      // Check for existing referral code to minimize unique index collisions
      const existing = await mongoose.models.User.findOne({ referralCode: candidate });
      if (!existing) {
        this.referralCode = candidate;
        this.coachCode = candidate;
        break;
      }
    }
  }
  next();
});

// ------------------------------
// 🔑 Password Comparison Method
// ------------------------------
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    throw new Error("Password field is not selected on this user document");
  }
  return bcrypt.compare(enteredPassword, this.password);
};

// ------------------------------
// 📊 Virtual Relationships
// ------------------------------
// Each coach can have many clients
userSchema.virtual("clients", {
  ref: "User",
  localField: "_id",
  foreignField: "coachId",
});

// ------------------------------
// ⚙️ Indexes for Performance
// ------------------------------
userSchema.index({ createdAt: -1 }); // for sorting newest users quickly
// removed stale index: assignedCoach does not exist; clients reference a coach via coachId


const User = mongoose.model("User", userSchema);

export default User;