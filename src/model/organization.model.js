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
    ref: 'OrganizationUser',
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true
});

// Create indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ email: 1 });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
