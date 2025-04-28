import { IStorage } from '../storage';
import mongoose from 'mongoose';
import { 
  User as UserType, 
  ChitGroup as ChitGroupType,
  ChitGroupMember as ChitGroupMemberType,
  Auction as AuctionType,
  Bid as BidType,
  Payment as PaymentType,
  Notification as NotificationType,
  InsertUser,
  InsertChitGroup,
  InsertChitGroupMember,
  InsertAuction,
  InsertBid,
  InsertPayment,
  InsertNotification
} from '@shared/schema';
import { 
  User, 
  ChitGroup, 
  ChitGroupMember, 
  Auction, 
  Bid, 
  Payment, 
  Notification,
  getNextSequence,
  connectToMongoDB
} from './mongoose';
import session from 'express-session';
import connectMongo from 'connect-mongo';

// Helper functions to convert types correctly
function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

function formatTimestamp(date: Date | null | undefined): Date | null {
  if (!date) return null;
  return new Date(date);
}

// Converts MongoDB document to properly typed User object
function convertUserDocument(doc: any): UserType {
  if (!doc) return doc;
  
  return {
    id: doc.id,
    username: doc.username,
    password: doc.password,
    phone: doc.phone,
    name: doc.name,
    email: doc.email || null,
    role: doc.role as "manager" | "customer",
    isFirstLogin: doc.isFirstLogin,
    managerId: doc.managerId || null, // Include managerId, null for managers
    createdAt: formatTimestamp(doc.createdAt) as Date
  };
}

// Converts MongoDB document to properly typed ChitGroup object
function convertChitGroupDocument(doc: any): ChitGroupType {
  if (!doc) return doc;
  
  return {
    id: doc.id,
    name: doc.name,
    value: doc.value,
    duration: doc.duration,
    membersCount: doc.membersCount,
    startDate: formatDate(doc.startDate) as string,
    isActive: doc.isActive,
    createdBy: doc.createdBy,
    createdAt: formatTimestamp(doc.createdAt) as Date
  };
}

// Converts MongoDB document to properly typed ChitGroupMember object
function convertChitGroupMemberDocument(doc: any): ChitGroupMemberType {
  if (!doc) return doc;
  
  return {
    id: doc.id,
    chitGroupId: doc.chitGroupId,
    userId: doc.userId,
    joinDate: formatDate(doc.joinDate) as string,
    createdAt: formatTimestamp(doc.createdAt) as Date
  };
}

// Converts MongoDB document to properly typed Auction object
function convertAuctionDocument(doc: any): AuctionType {
  if (!doc) return doc;
  
  return {
    id: doc.id,
    chitGroupId: doc.chitGroupId,
    auctionDate: formatDate(doc.auctionDate) as string,
    winnerUserId: doc.winnerUserId || null,
    winningBid: doc.winningBid || null,
    status: doc.status,
    monthNumber: doc.monthNumber,
    createdAt: formatTimestamp(doc.createdAt) as Date
  };
}

// Converts MongoDB document to properly typed Bid object
function convertBidDocument(doc: any): BidType {
  if (!doc) return doc;
  
  return {
    id: doc.id,
    auctionId: doc.auctionId,
    userId: doc.userId,
    bidAmount: doc.bidAmount,
    bidTime: formatTimestamp(doc.bidTime) as Date,
    createdAt: formatTimestamp(doc.createdAt) as Date
  };
}

// Converts MongoDB document to properly typed Payment object
function convertPaymentDocument(doc: any): PaymentType {
  if (!doc) return doc;
  
  return {
    id: doc.id,
    chitGroupId: doc.chitGroupId,
    userId: doc.userId,
    amount: doc.amount,
    paymentDate: formatDate(doc.paymentDate) as string,
    monthNumber: doc.monthNumber,
    status: doc.status,
    createdAt: formatTimestamp(doc.createdAt) as Date
  };
}

// Converts MongoDB document to properly typed Notification object
function convertNotificationDocument(doc: any): NotificationType {
  if (!doc) return doc;
  
  return {
    id: doc.id,
    userId: doc.userId,
    message: doc.message,
    isRead: doc.isRead,
    type: doc.type,
    createdAt: formatTimestamp(doc.createdAt) as Date
  };
}

export class MongoStorage implements IStorage {
  sessionStore: any; // Use any type for sessionStore to avoid TypeScript errors
  connectionStatus: 'connecting' | 'connected' | 'failed' = 'connecting';

  constructor() {
    try {
      // Use basic session store as fallback initially
      this.sessionStore = {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
        destroy: () => Promise.resolve(),
        all: () => Promise.resolve({}),
        touch: () => Promise.resolve(),
        on: (event: string, callback: () => void) => {}
      };
      
      // Then asynchronously set up the proper memory store
      import('memorystore').then(memorystore => {
        const MemoryStore = memorystore.default(session);
        this.sessionStore = new MemoryStore({
          checkPeriod: 86400000 // 1 day
        });
        console.log("Memory session store initialized");
      }).catch(err => {
        console.error("Failed to initialize memory session store:", err);
      });

      // Connect to MongoDB
      console.log("Attempting to connect to MongoDB...");
      
      // Set a more aggressive timeout to make the decision sooner
      let connectionTimeout = setTimeout(() => {
        if (this.connectionStatus === 'connecting') {
          console.error("MongoDB connection timed out");
          this.connectionStatus = 'failed';
        }
      }, 4000); // 4 second timeout
      
      connectToMongoDB()
        .then(() => {
          clearTimeout(connectionTimeout);
          console.log("Successfully connected to MongoDB!");
          this.connectionStatus = 'connected';
          
          // After successful connection to MongoDB, setup the MongoDB session store
          import('connect-mongo').then(connectMongoModule => {
            const MongoStore = connectMongoModule.default.create({
              mongoUrl: process.env.MONGODB_URI,
              collectionName: 'sessions',
              ttl: 60 * 60 * 24 // 1 day
            });
            this.sessionStore = MongoStore;
            console.log("MongoDB session store initialized!");
          }).catch(err => {
            console.error("Failed to initialize MongoDB session store:", err);
            // Keep using the basic session store initialized above
          });
        })
        .catch(err => {
          clearTimeout(connectionTimeout);
          console.error("Failed to connect to MongoDB:", err.message);
          this.connectionStatus = 'failed';
        });
    } catch (error) {
      console.error("Error initializing storage:", error);
      this.connectionStatus = 'failed';
    }
  }

  // User operations
  async getUser(id: number): Promise<UserType | undefined> {
    const user = await User.findOne({ id });
    if (!user) return undefined;
    
    // Convert Mongoose document to plain object that matches our interface
    return convertUserDocument(user.toObject());
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    const user = await User.findOne({ username });
    if (!user) return undefined;
    
    // Convert Mongoose document to plain object that matches our interface
    return convertUserDocument(user.toObject());
  }

  async createUser(userData: InsertUser): Promise<UserType> {
    try {
      console.log("Creating user with data:", JSON.stringify({
        ...userData,
        password: '[REDACTED]' // Don't log the actual password
      }));
      
      const id = await getNextSequence('User');
      
      // Make sure managerId is set correctly for customers
      if (userData.role === 'customer') {
        if (!userData.managerId) {
          console.error("ERROR: Attempting to create a customer without a managerId");
        } else {
          console.log(`Creating customer with managerId: ${userData.managerId}`);
        }
      } else {
        // For managers, managerId should be null
        console.log("Creating a manager user, managerId will be null");
        delete userData.managerId; // Remove managerId for managers if it exists
      }
      
      // Create the user document
      const newUser = new User({
        ...userData,
        id,
        createdAt: new Date()
      });
      
      await newUser.save();
      console.log(`User created successfully with ID: ${id}, role: ${userData.role}, managerId: ${userData.managerId || null}`);
      
      // Verify the data was saved correctly
      const createdUser = await User.findOne({ id });
      if (!createdUser) {
        throw new Error("User was not saved properly");
      }
      
      console.log(`Verified user data: id=${createdUser.id}, username=${createdUser.username}, role=${createdUser.role}, managerId=${createdUser.managerId || null}`);
      
      return convertUserDocument(newUser.toObject());
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<UserType>): Promise<UserType | undefined> {
    const user = await User.findOneAndUpdate(
      { id },
      { $set: userData },
      { new: true }
    );
    if (!user) return undefined;
    return convertUserDocument(user.toObject());
  }

  async getAllUsers(): Promise<UserType[]> {
    const users = await User.find();
    return users.map(user => convertUserDocument(user.toObject()));
  }

  async getCustomers(): Promise<UserType[]> {
    console.log("WARNING: Using getCustomers() method that returns ALL customers. This should be replaced with getCustomersByManager() for security.");
    // This is now a deprecated method as it returns all customers regardless of manager
    // It should be replaced with getCustomersByManager(managerId) in all code
    const customers = await User.find({ role: 'customer' });
    return customers.map(customer => convertUserDocument(customer.toObject()));
  }
  
  async getCustomersByManager(managerId: number): Promise<UserType[]> {
    console.log(`getCustomersByManager: Finding customers with managerId=${managerId}`);
    
    // First, check how many total customers exist
    const allCustomers = await User.find({ role: 'customer' });
    console.log(`getCustomersByManager: Found ${allCustomers.length} total customers in the system`);
    console.log('All customers:', JSON.stringify(allCustomers.map(c => ({ 
      id: c.id, 
      username: c.username, 
      managerId: c.managerId || null 
    }))));
    
    // Now filter by manager ID
    const customers = await User.find({ 
      role: 'customer',
      managerId: managerId 
    });
    
    console.log(`getCustomersByManager: Found ${customers.length} customers with managerId=${managerId}`);
    console.log('Filtered customers:', JSON.stringify(customers.map(c => ({ 
      id: c.id, 
      username: c.username, 
      managerId: c.managerId || null 
    }))));
    
    return customers.map(customer => convertUserDocument(customer.toObject()));
  }

  // Chit Group operations
  async createChitGroup(chitGroupData: InsertChitGroup): Promise<ChitGroupType> {
    try {
      console.log("MongoDB createChitGroup - Starting with data:", JSON.stringify(chitGroupData));
      
      // Get next id
      const id = await getNextSequence('ChitGroup');
      console.log("MongoDB createChitGroup - Got sequence ID:", id);
      
      // Parse startDate string to Date object as MongoDB expects a Date
      let startDate: Date;
      try {
        startDate = new Date(chitGroupData.startDate);
        console.log("MongoDB createChitGroup - Parsed startDate:", startDate.toISOString());
      } catch (error) {
        console.error("MongoDB createChitGroup - Error parsing startDate:", error);
        startDate = new Date(); // Fallback to current date if parsing fails
      }
      
      // Create document data with all necessary fields
      const chitGroupDoc = {
        ...chitGroupData,
        id,
        startDate, // Use the parsed Date object
        createdAt: new Date()
      };
      
      console.log("MongoDB createChitGroup - Creating document with:", JSON.stringify(chitGroupDoc));
      
      // Create and save to MongoDB
      const newChitGroup = new ChitGroup(chitGroupDoc);
      await newChitGroup.save();
      
      console.log("MongoDB createChitGroup - Saved document successfully");
      
      // Print out the database and collection names for verification
      console.log("MongoDB createChitGroup - Collection info:", 
        `DB: ${mongoose.connection.db.databaseName}, ` +
        `Collection: ${ChitGroup.collection.name}`);

      // Verify the data was saved by retrieving it
      const retrievedChitGroup = await ChitGroup.findOne({ id });
      console.log("MongoDB createChitGroup - Retrieved document:", 
        retrievedChitGroup ? "Found" : "Not found");
      
      if (retrievedChitGroup) {
        console.log("MongoDB createChitGroup - Document contents:", JSON.stringify(retrievedChitGroup.toObject()));
      }
      
      const result = convertChitGroupDocument(newChitGroup.toObject());
      console.log("MongoDB createChitGroup - Returning result:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('MongoDB createChitGroup - Error creating chit group:', error);
      throw error;
    }
  }

  async getChitGroup(id: number): Promise<ChitGroupType | undefined> {
    const chitGroup = await ChitGroup.findOne({ id });
    if (!chitGroup) return undefined;
    return convertChitGroupDocument(chitGroup.toObject());
  }

  async getAllChitGroups(): Promise<ChitGroupType[]> {
    const chitGroups = await ChitGroup.find();
    return chitGroups.map(chitGroup => convertChitGroupDocument(chitGroup.toObject()));
  }

  async updateChitGroup(id: number, chitGroupData: Partial<ChitGroupType>): Promise<ChitGroupType | undefined> {
    // Process data for MongoDB
    const processedData = { ...chitGroupData };
    
    // Handle startDate conversion if present
    if (processedData.startDate && typeof processedData.startDate === 'string') {
      try {
        processedData.startDate = new Date(processedData.startDate);
        console.log("Parsed startDate for update:", processedData.startDate);
      } catch (error) {
        console.error("Error parsing startDate for update:", error);
        delete processedData.startDate; // Remove if it can't be parsed
      }
    }
    
    console.log("Updating chit group with data:", processedData);
    
    const chitGroup = await ChitGroup.findOneAndUpdate(
      { id },
      { $set: processedData },
      { new: true }
    );
    if (!chitGroup) return undefined;
    return convertChitGroupDocument(chitGroup.toObject());
  }

  async getChitGroupsByUser(userId: number): Promise<ChitGroupType[]> {
    try {
      console.log(`Getting chit groups for user ID ${userId}`);
      
      // Find all memberships for this user
      const memberships = await ChitGroupMember.find({ userId });
      console.log(`Found ${memberships.length} memberships for user ID ${userId}:`, 
        JSON.stringify(memberships.map(m => ({ id: m.id, chitGroupId: m.chitGroupId })))
      );
      
      const chitGroupIds = memberships.map(m => m.chitGroupId);
      
      if (chitGroupIds.length === 0) {
        console.log(`No chit group IDs found for user ID ${userId}`);
        return [];
      }
      
      // Find all chit groups with these IDs
      const chitGroups = await ChitGroup.find({ id: { $in: chitGroupIds } });
      console.log(`Found ${chitGroups.length} chit groups for user ID ${userId} with IDs: ${chitGroupIds.join(', ')}`);
      
      return chitGroups.map(group => convertChitGroupDocument(group.toObject()));
    } catch (error) {
      console.error(`Error in getChitGroupsByUser for user ID ${userId}:`, error);
      throw error;
    }
  }

  // Chit Group Member operations
  async addMemberToChitGroup(memberData: InsertChitGroupMember): Promise<ChitGroupMemberType> {
    const id = await getNextSequence('ChitGroupMember');
    const newMember = new ChitGroupMember({
      ...memberData,
      id,
      createdAt: new Date()
    });
    await newMember.save();
    return convertChitGroupMemberDocument(newMember.toObject());
  }

  async getChitGroupMembers(chitGroupId: number): Promise<ChitGroupMemberType[]> {
    try {
      console.log(`Getting members for chit group ID ${chitGroupId}`);
      const members = await ChitGroupMember.find({ chitGroupId });
      console.log(`Found ${members.length} members for chit group ID ${chitGroupId}:`, 
        JSON.stringify(members.map(m => ({ id: m.id, userId: m.userId })))
      );
      return members.map(member => convertChitGroupMemberDocument(member.toObject()));
    } catch (error) {
      console.error(`Error in getChitGroupMembers for chit group ID ${chitGroupId}:`, error);
      throw error;
    }
  }

  async removeMemberFromChitGroup(chitGroupId: number, userId: number): Promise<boolean> {
    console.log(`Removing user ID ${userId} from chit group ID ${chitGroupId}`);
    
    // First, verify that the membership exists
    const membership = await ChitGroupMember.findOne({ chitGroupId, userId });
    if (!membership) {
      console.log(`Membership not found for user ID ${userId} in chit group ID ${chitGroupId}`);
      return false;
    }
    
    console.log(`Found membership to remove: ${JSON.stringify(membership)}`);
    
    // Delete the membership
    const result = await ChitGroupMember.deleteOne({ chitGroupId, userId });
    
    // Verify deletion
    const deleted = result.deletedCount > 0;
    console.log(`Membership deletion result: ${deleted ? 'Success' : 'Failed'}, deleted ${result.deletedCount} documents`);
    
    return deleted;
  }

  // Auction operations
  async createAuction(auctionData: InsertAuction): Promise<AuctionType> {
    const id = await getNextSequence('Auction');
    const newAuction = new Auction({
      ...auctionData,
      id,
      createdAt: new Date()
    });
    await newAuction.save();
    return convertAuctionDocument(newAuction.toObject());
  }

  async getAuction(id: number): Promise<AuctionType | undefined> {
    const auction = await Auction.findOne({ id });
    if (!auction) return undefined;
    return convertAuctionDocument(auction.toObject());
  }

  async getAuctionsByChitGroup(chitGroupId: number): Promise<AuctionType[]> {
    const auctions = await Auction.find({ chitGroupId });
    return auctions.map(auction => convertAuctionDocument(auction.toObject()));
  }

  async updateAuction(id: number, auctionData: Partial<AuctionType>): Promise<AuctionType | undefined> {
    const auction = await Auction.findOneAndUpdate(
      { id },
      { $set: auctionData },
      { new: true }
    );
    if (!auction) return undefined;
    return convertAuctionDocument(auction.toObject());
  }

  // Bid operations
  async createBid(bidData: InsertBid): Promise<BidType> {
    const id = await getNextSequence('Bid');
    const newBid = new Bid({
      ...bidData,
      id,
      bidTime: new Date(),
      createdAt: new Date()
    });
    await newBid.save();
    return convertBidDocument(newBid.toObject());
  }

  async getBidsByAuction(auctionId: number): Promise<BidType[]> {
    const bids = await Bid.find({ auctionId });
    return bids.map(bid => convertBidDocument(bid.toObject()));
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<PaymentType> {
    const id = await getNextSequence('Payment');
    const newPayment = new Payment({
      ...paymentData,
      id,
      createdAt: new Date()
    });
    await newPayment.save();
    return convertPaymentDocument(newPayment.toObject());
  }

  async getPaymentsByUser(userId: number): Promise<PaymentType[]> {
    const payments = await Payment.find({ userId });
    return payments.map(payment => convertPaymentDocument(payment.toObject()));
  }

  async getPaymentsByChitGroup(chitGroupId: number): Promise<PaymentType[]> {
    const payments = await Payment.find({ chitGroupId });
    return payments.map(payment => convertPaymentDocument(payment.toObject()));
  }

  async updatePayment(id: number, paymentData: Partial<PaymentType>): Promise<PaymentType | undefined> {
    const payment = await Payment.findOneAndUpdate(
      { id },
      { $set: paymentData },
      { new: true }
    );
    if (!payment) return undefined;
    return convertPaymentDocument(payment.toObject());
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<NotificationType> {
    const id = await getNextSequence('Notification');
    const newNotification = new Notification({
      ...notificationData,
      id,
      isRead: false,
      createdAt: new Date()
    });
    await newNotification.save();
    return convertNotificationDocument(newNotification.toObject());
  }

  async getNotificationsByUser(userId: number): Promise<NotificationType[]> {
    const notifications = await Notification.find({ userId });
    return notifications.map(notification => convertNotificationDocument(notification.toObject()));
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await Notification.updateOne(
      { id },
      { $set: { isRead: true } }
    );
    return result.modifiedCount > 0;
  }
}