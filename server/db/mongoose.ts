import mongoose from 'mongoose';
import { UserRole } from '@shared/schema';

// Connect to MongoDB with options to handle IP whitelisting issues
export async function connectToMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Configure mongoose connection options for best security and reliability
    const options = {
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true, // Retry failed writes
      retryReads: true // Retry failed reads
      // Removed directConnection option which is incompatible with SRV URIs
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('Successfully connected to MongoDB Atlas!');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Define schemas

// User schema
const UserSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // Add id field to match our interface
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  role: { type: String, required: true, enum: ['manager', 'customer'] },
  isFirstLogin: { type: Boolean, default: true },
  managerId: { type: Number }, // Manager ID for customers, null for managers
  createdAt: { type: Date, default: Date.now }
});

// Chit group schema
const ChitGroupSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  value: { type: Number, required: true },
  duration: { type: Number, required: true },
  membersCount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Chit group member schema
const ChitGroupMemberSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  chitGroupId: { type: Number, required: true },
  userId: { type: Number, required: true },
  joinDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Auction schema
const AuctionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  chitGroupId: { type: Number, required: true },
  auctionDate: { type: Date, required: true },
  winnerUserId: { type: Number, default: null },
  winningBid: { type: Number, default: null },
  status: { type: String, required: true, enum: ['scheduled', 'completed', 'cancelled'] },
  monthNumber: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Bid schema
const BidSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  auctionId: { type: Number, required: true },
  userId: { type: Number, required: true },
  bidAmount: { type: Number, required: true },
  bidTime: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Payment schema
const PaymentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  chitGroupId: { type: Number, required: true },
  userId: { type: Number, required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  monthNumber: { type: Number, required: true },
  status: { type: String, required: true, enum: ['paid', 'pending', 'overdue'] },
  createdAt: { type: Date, default: Date.now }
});

// Notification schema
const NotificationSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  type: { type: String, required: true, enum: ['payment', 'auction', 'general'] },
  createdAt: { type: Date, default: Date.now }
});

// Create models
export const User = mongoose.model('User', UserSchema);
export const ChitGroup = mongoose.model('ChitGroup', ChitGroupSchema);
export const ChitGroupMember = mongoose.model('ChitGroupMember', ChitGroupMemberSchema);
export const Auction = mongoose.model('Auction', AuctionSchema);
export const Bid = mongoose.model('Bid', BidSchema);
export const Payment = mongoose.model('Payment', PaymentSchema);
export const Notification = mongoose.model('Notification', NotificationSchema);

// Counter model for auto-incrementing IDs (to mimic SQL behavior)
const CounterSchema = new mongoose.Schema({
  model: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 }
});

export const Counter = mongoose.model('Counter', CounterSchema);

// Create a function to get the next sequence value for a model
export async function getNextSequence(modelName: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { model: modelName },
    { $inc: { count: 1 } },
    { new: true, upsert: true }
  );
  return counter.count;
}