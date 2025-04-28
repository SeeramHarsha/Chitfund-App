import { 
  User, InsertUser, 
  ChitGroup, InsertChitGroup, 
  ChitGroupMember, InsertChitGroupMember,
  Auction, InsertAuction,
  Bid, InsertBid,
  Payment, InsertPayment,
  Notification, InsertNotification
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface with CRUD methods for all entities
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getCustomers(): Promise<User[]>;
  getCustomersByManager(managerId: number): Promise<User[]>;
  
  // Chit Group operations
  createChitGroup(chitGroup: InsertChitGroup): Promise<ChitGroup>;
  getChitGroup(id: number): Promise<ChitGroup | undefined>;
  getAllChitGroups(): Promise<ChitGroup[]>;
  updateChitGroup(id: number, chitGroupData: Partial<ChitGroup>): Promise<ChitGroup | undefined>;
  getChitGroupsByUser(userId: number): Promise<ChitGroup[]>;
  
  // Chit Group Member operations
  addMemberToChitGroup(chitGroupMember: InsertChitGroupMember): Promise<ChitGroupMember>;
  getChitGroupMembers(chitGroupId: number): Promise<ChitGroupMember[]>;
  removeMemberFromChitGroup(chitGroupId: number, userId: number): Promise<boolean>;
  
  // Auction operations
  createAuction(auction: InsertAuction): Promise<Auction>;
  getAuction(id: number): Promise<Auction | undefined>;
  getAuctionsByChitGroup(chitGroupId: number): Promise<Auction[]>;
  updateAuction(id: number, auctionData: Partial<Auction>): Promise<Auction | undefined>;
  
  // Bid operations
  createBid(bid: InsertBid): Promise<Bid>;
  getBidsByAuction(auctionId: number): Promise<Bid[]>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByUser(userId: number): Promise<Payment[]>;
  getPaymentsByChitGroup(chitGroupId: number): Promise<Payment[]>;
  updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;

  // Session store
  sessionStore: any; // Using 'any' type to resolve TypeScript error
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chitGroups: Map<number, ChitGroup>;
  private chitGroupMembers: Map<number, ChitGroupMember>;
  private auctions: Map<number, Auction>;
  private bids: Map<number, Bid>;
  private payments: Map<number, Payment>;
  private notifications: Map<number, Notification>;
  
  sessionStore: any; // Using 'any' type to resolve TypeScript error
  
  private userIdCounter: number;
  private chitGroupIdCounter: number;
  private chitGroupMemberIdCounter: number;
  private auctionIdCounter: number;
  private bidIdCounter: number;
  private paymentIdCounter: number;
  private notificationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.chitGroups = new Map();
    this.chitGroupMembers = new Map();
    this.auctions = new Map();
    this.bids = new Map();
    this.payments = new Map();
    this.notifications = new Map();
    
    this.userIdCounter = 1;
    this.chitGroupIdCounter = 1;
    this.chitGroupMemberIdCounter = 1;
    this.auctionIdCounter = 1;
    this.bidIdCounter = 1;
    this.paymentIdCounter = 1;
    this.notificationIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    
    // Ensure required fields are set to prevent TypeScript errors
    const email = userData.email || null;
    const isFirstLogin = userData.isFirstLogin !== undefined ? userData.isFirstLogin : true;
    
    // Set managerId appropriately - null for managers, provided value for customers
    const managerId = userData.role === 'customer' ? (userData.managerId || null) : null;
    
    const user: User = { 
      ...userData, 
      id, 
      createdAt, 
      email,
      isFirstLogin,
      managerId, // Add the managerId field
      role: userData.role as "manager" | "customer"
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getCustomers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === 'customer');
  }
  
  // Get customers by manager ID
  async getCustomersByManager(managerId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.role === 'customer' && user.managerId === managerId
    );
  }

  // Chit Group operations
  async createChitGroup(chitGroupData: InsertChitGroup): Promise<ChitGroup> {
    const id = this.chitGroupIdCounter++;
    const createdAt = new Date();
    
    // Ensure isActive is set to prevent TypeScript errors
    const isActive = chitGroupData.isActive !== undefined ? chitGroupData.isActive : true;
    
    // Parse startDate if it's a string
    let startDate = chitGroupData.startDate;
    if (typeof startDate === 'string') {
      try {
        // Keep it as a string but ensure it's in the right format
        startDate = new Date(startDate).toISOString().split('T')[0];
        console.log("In-memory storage parsed startDate:", startDate);
      } catch (error) {
        console.error("In-memory storage error parsing startDate:", error);
      }
    }
    
    console.log("In-memory storage createChitGroup data:", { ...chitGroupData, startDate });
    
    // Ensure all required fields are present
    const chitGroup: ChitGroup = { 
      ...chitGroupData, 
      startDate,
      id, 
      createdAt,
      isActive,
      // Note: createdBy should be provided in chitGroupData from the routes
      // If it's missing (which shouldn't happen), set it to 0 to avoid TypeScript errors
      createdBy: chitGroupData.createdBy || 0
    };
    
    console.log("In-memory storage creating chit group:", chitGroup);
    this.chitGroups.set(id, chitGroup);
    return chitGroup;
  }

  async getChitGroup(id: number): Promise<ChitGroup | undefined> {
    return this.chitGroups.get(id);
  }

  async getAllChitGroups(): Promise<ChitGroup[]> {
    return Array.from(this.chitGroups.values());
  }

  async updateChitGroup(id: number, chitGroupData: Partial<ChitGroup>): Promise<ChitGroup | undefined> {
    const chitGroup = this.chitGroups.get(id);
    if (!chitGroup) return undefined;
    
    // Process data before updating
    const processedData = { ...chitGroupData };
    
    // Handle startDate conversion if present
    if (processedData.startDate && typeof processedData.startDate === 'string') {
      try {
        // Keep it as a string but ensure it's in the right format
        processedData.startDate = new Date(processedData.startDate).toISOString().split('T')[0];
        console.log("In-memory storage parsed startDate for update:", processedData.startDate);
      } catch (error) {
        console.error("In-memory storage error parsing startDate for update:", error);
        delete processedData.startDate; // Remove if it can't be parsed
      }
    }
    
    console.log("In-memory storage updating chit group with processed data:", processedData);
    
    const updatedChitGroup = { ...chitGroup, ...processedData };
    this.chitGroups.set(id, updatedChitGroup);
    return updatedChitGroup;
  }

  async getChitGroupsByUser(userId: number): Promise<ChitGroup[]> {
    const memberEntries = Array.from(this.chitGroupMembers.values())
      .filter(member => member.userId === userId);
      
    return memberEntries.map(member => 
      this.chitGroups.get(member.chitGroupId)
    ).filter((group): group is ChitGroup => group !== undefined);
  }

  // Chit Group Member operations
  async addMemberToChitGroup(memberData: InsertChitGroupMember): Promise<ChitGroupMember> {
    const id = this.chitGroupMemberIdCounter++;
    const createdAt = new Date();
    const member: ChitGroupMember = { ...memberData, id, createdAt };
    this.chitGroupMembers.set(id, member);
    return member;
  }

  async getChitGroupMembers(chitGroupId: number): Promise<ChitGroupMember[]> {
    return Array.from(this.chitGroupMembers.values())
      .filter(member => member.chitGroupId === chitGroupId);
  }

  async removeMemberFromChitGroup(chitGroupId: number, userId: number): Promise<boolean> {
    const memberEntry = Array.from(this.chitGroupMembers.entries())
      .find(([_, member]) => member.chitGroupId === chitGroupId && member.userId === userId);
      
    if (!memberEntry) return false;
    
    this.chitGroupMembers.delete(memberEntry[0]);
    return true;
  }

  // Auction operations
  async createAuction(auctionData: InsertAuction): Promise<Auction> {
    const id = this.auctionIdCounter++;
    const createdAt = new Date();
    
    // Ensure winner fields are set to prevent TypeScript errors
    const winnerUserId = auctionData.winnerUserId !== undefined ? auctionData.winnerUserId : null;
    const winningBid = auctionData.winningBid !== undefined ? auctionData.winningBid : null;
    
    const auction: Auction = { 
      ...auctionData, 
      id, 
      createdAt,
      winnerUserId,
      winningBid 
    };
    
    this.auctions.set(id, auction);
    return auction;
  }

  async getAuction(id: number): Promise<Auction | undefined> {
    return this.auctions.get(id);
  }

  async getAuctionsByChitGroup(chitGroupId: number): Promise<Auction[]> {
    return Array.from(this.auctions.values())
      .filter(auction => auction.chitGroupId === chitGroupId);
  }

  async updateAuction(id: number, auctionData: Partial<Auction>): Promise<Auction | undefined> {
    const auction = this.auctions.get(id);
    if (!auction) return undefined;
    
    const updatedAuction = { ...auction, ...auctionData };
    this.auctions.set(id, updatedAuction);
    return updatedAuction;
  }

  // Bid operations
  async createBid(bidData: InsertBid): Promise<Bid> {
    const id = this.bidIdCounter++;
    const createdAt = new Date();
    const bidTime = new Date();
    const bid: Bid = { ...bidData, id, bidTime, createdAt };
    this.bids.set(id, bid);
    return bid;
  }

  async getBidsByAuction(auctionId: number): Promise<Bid[]> {
    return Array.from(this.bids.values())
      .filter(bid => bid.auctionId === auctionId);
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const createdAt = new Date();
    const payment: Payment = { ...paymentData, id, createdAt };
    this.payments.set(id, payment);
    return payment;
  }

  async getPaymentsByUser(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId);
  }

  async getPaymentsByChitGroup(chitGroupId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.chitGroupId === chitGroupId);
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...paymentData };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const createdAt = new Date();
    const notification: Notification = { 
      ...notificationData, 
      id, 
      isRead: false, 
      createdAt 
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId);
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }
}

// Create a MongoDB connection for storage
import { MongoStorage } from './db/mongo-storage';

// Use MongoDB for storage
// Try to connect to MongoDB first, but fallback to in-memory storage if connection fails
export const storage = new MongoStorage();

// Fallback to in-memory storage if MongoDB connection fails after 10 seconds
// Increasing timeout to give MongoDB more time to connect
setTimeout(() => {
  console.log('Checking MongoDB connection status:', storage.connectionStatus);
  if (storage.connectionStatus === 'failed') {
    console.log('Switching to in-memory storage as fallback.');
    const memStorage = new MemStorage();
    // Copy all methods from memStorage to storage
    Object.getOwnPropertyNames(MemStorage.prototype).forEach((method) => {
      if (method !== 'constructor') {
        (storage as any)[method] = (memStorage as any)[method].bind(memStorage);
      }
    });
    storage.sessionStore = memStorage.sessionStore;
    console.log('In-memory storage fallback complete.');
  } else if (storage.connectionStatus === 'connected') {
    console.log('MongoDB connection is active and being used for storage.');
  } else {
    console.log('MongoDB connection is still connecting. Extending timeout.');
    
    // Give another 10 seconds to connect before falling back
    setTimeout(() => {
      console.log('Final check - MongoDB connection status:', storage.connectionStatus);
      if (storage.connectionStatus !== 'connected') {
        console.log('MongoDB failed to connect after extended timeout. Switching to in-memory storage fallback.');
        const memStorage = new MemStorage();
        // Copy all methods from memStorage to storage
        Object.getOwnPropertyNames(MemStorage.prototype).forEach((method) => {
          if (method !== 'constructor') {
            (storage as any)[method] = (memStorage as any)[method].bind(memStorage);
          }
        });
        storage.sessionStore = memStorage.sessionStore;
        console.log('In-memory storage fallback complete.');
      }
    }, 10000);
  }
}, 10000);
