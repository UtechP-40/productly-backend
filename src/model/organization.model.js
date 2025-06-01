import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // ✅ Corrected
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  logo: {
    type: String,
    default: "https://via.placeholder.com/200"
  },
  meta: {
    industry: String,
    country: String,
    size: Number,
    website: String
  }
}, {
  timestamps: true
});

// Indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ email: 1 });

// Auto-generate slug from name if not provided
organizationSchema.pre("validate", function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
