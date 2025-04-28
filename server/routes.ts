import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  User,
  insertChitGroupSchema, 
  insertChitGroupMemberSchema, 
  insertAuctionSchema, 
  insertBidSchema, 
  insertPaymentSchema, 
  insertNotificationSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper function to handle validation errors
function validateRequest(req: Request, schema: any) {
  try {
    console.log("Request body:", JSON.stringify(req.body));
    const result = schema.parse(req.body);
    console.log("Parsed data:", JSON.stringify(result));
    return { data: result, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = fromZodError(error).message;
      console.error("Validation error:", errorMessage);
      return { data: null, error: errorMessage };
    }
    console.error("Unknown error during validation:", error);
    return { data: null, error: "Invalid request data" };
  }
}

// Helper to ensure user is authenticated
// This middleware ensures that the request is authenticated
// and adds proper TypeScript typing to the user object
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // This is a TypeScript safety check - req.user is guaranteed to exist after isAuthenticated() 
  // but TypeScript doesn't know that
  if (!req.user) {
    return res.status(401).json({ message: "User not found in session" });
  }
  
  // At this point req.user is guaranteed to be defined
  // Use type assertion to help TypeScript understand this
  (req as Request & { user: User }).user;
  
  next();
}

// Helper to ensure user is a manager
function isManager(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // This is a TypeScript safety check
  if (!req.user) {
    return res.status(401).json({ message: "User not found in session" });
  }
  
  // At this point req.user is guaranteed to be defined
  // Use type assertion to help TypeScript understand this
  const typedReq = req as Request & { user: User };
  
  if (typedReq.user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden - Manager access required" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Debug route to check consistency (will be removed after debugging)
  app.get("/api/debug/chitgroup-members", isAuthenticated, async (req, res) => {
    try {
      // Use type assertion to tell TypeScript that req.user is defined
      const user = (req as Request & { user: User }).user;
      
      if (user.role !== "manager") {
        return res.status(403).json({ message: "Only managers can access this endpoint" });
      }
      
      // Get all chit groups
      const chitGroups = await storage.getAllChitGroups();
      
      // For each chit group, get members
      const result = await Promise.all(
        chitGroups.map(async (group) => {
          const members = await storage.getChitGroupMembers(group.id);
          return {
            group,
            members,
            memberCount: members.length
          };
        })
      );
      
      res.json(result);
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ message: "Error in debug endpoint" });
    }
  });

  // API routes - prefix all with /api
  
  // Chit Groups API
  app.get("/api/chitgroups", isAuthenticated, async (req, res) => {
    try {
      // Use type assertion to tell TypeScript that req.user is defined
      const user = (req as Request & { user: User }).user;
      
      console.log(`=== GET /api/chitgroups request from user ID=${user.id}, role=${user.role} ===`);
      
      if (user.role === "manager") {
        // Managers can only see chit groups they created
        console.log(`Getting chit groups for manager ID ${user.id}`);
        const allChitGroups = await storage.getAllChitGroups();
        
        console.log(`DEBUG: All chit groups - ${JSON.stringify(allChitGroups.map(g => ({ id: g.id, name: g.name, createdBy: g.createdBy })))}`);
        
        // Filter to only show groups created by this manager
        const managerChitGroups = allChitGroups.filter(group => group.createdBy === user.id);
        
        console.log(`Manager ${user.id} has access to ${managerChitGroups.length} out of ${allChitGroups.length} total chit groups`);
        console.log(`DEBUG: Manager's chit groups - ${JSON.stringify(managerChitGroups.map(g => ({ id: g.id, name: g.name, createdBy: g.createdBy })))}`);
        
        res.json(managerChitGroups);
      } else {
        // Customers can only see their own chit groups
        console.log(`Getting chit groups for customer ID ${user.id}`);
        const chitGroups = await storage.getChitGroupsByUser(user.id);
        console.log(`Customer ${user.id} has access to ${chitGroups.length} chit groups`);
        console.log(`DEBUG: Customer's chit groups - ${JSON.stringify(chitGroups.map(g => ({ id: g.id, name: g.name })))}`);
        
        res.json(chitGroups);
      }
    } catch (error) {
      console.error("Error fetching chit groups:", error);
      res.status(500).json({ message: "Failed to fetch chit groups" });
    }
  });

  app.get("/api/chitgroups/:id", isAuthenticated, async (req, res) => {
    try {
      const chitGroupId = parseInt(req.params.id);
      const chitGroup = await storage.getChitGroup(chitGroupId);
      
      if (!chitGroup) {
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      // Use type assertion to tell TypeScript that req.user is defined
      const user = (req as Request & { user: User }).user;
      
      if (user.role === "manager") {
        // Managers can only access chit groups they created
        if (chitGroup.createdBy !== user.id) {
          console.log(`Security check: Manager ${user.id} attempted to access chit group ${chitGroupId} created by manager ${chitGroup.createdBy}`);
          return res.status(403).json({ message: "You can only access chit groups you've created" });
        }
      } else {
        // If user is customer, verify they are a member
        const members = await storage.getChitGroupMembers(chitGroupId);
        const isMember = members.some(member => member.userId === user.id);
        
        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this chit group" });
        }
      }
      
      res.json(chitGroup);
    } catch (error) {
      console.error("Error fetching chit group:", error);
      res.status(500).json({ message: "Failed to fetch chit group" });
    }
  });

  app.post("/api/chitgroups", isManager, async (req, res) => {
    const { data, error } = validateRequest(req, insertChitGroupSchema);
    
    if (error) {
      return res.status(400).json({ message: error });
    }
    
    try {
      // TypeScript check
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const chitGroup = await storage.createChitGroup({
        ...data,
        createdBy: req.user.id
      });
      
      res.status(201).json(chitGroup);
    } catch (error) {
      res.status(500).json({ message: "Failed to create chit group" });
    }
  });

  app.put("/api/chitgroups/:id", isManager, async (req, res) => {
    try {
      const chitGroupId = parseInt(req.params.id);
      const chitGroup = await storage.getChitGroup(chitGroupId);
      
      if (!chitGroup) {
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      // TypeScript type assertion
      const user = (req as Request & { user: User }).user;
      
      const { data, error } = validateRequest(req, insertChitGroupSchema.partial());
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const updatedChitGroup = await storage.updateChitGroup(chitGroupId, data);
      res.json(updatedChitGroup);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chit group" });
    }
  });

  // Chit Group Members API
  app.get("/api/chitgroups/:id/members", isAuthenticated, async (req, res) => {
    try {
      const chitGroupId = parseInt(req.params.id);
      const chitGroup = await storage.getChitGroup(chitGroupId);
      
      if (!chitGroup) {
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      // TypeScript type assertion
      const user = (req as Request & { user: User }).user;
      
      if (user.role === "manager") {
        // Managers can only access members of chit groups they created
        if (chitGroup.createdBy !== user.id) {
          console.log(`Security check: Manager ${user.id} attempted to view members of chit group ${chitGroupId} created by manager ${chitGroup.createdBy}`);
          return res.status(403).json({ message: "You can only view members of chit groups you've created" });
        }
      } else {
        // If user is customer, verify they are a member
        const members = await storage.getChitGroupMembers(chitGroupId);
        const isMember = members.some(member => member.userId === user.id);
        
        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this chit group" });
        }
      }
      
      console.log(`Fetching members for chit group ${chitGroupId}`);
      const members = await storage.getChitGroupMembers(chitGroupId);
      
      // Get user details for each member
      const memberDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user ? {
              id: user.id,
              name: user.name,
              phone: user.phone,
              email: user.email
            } : null
          };
        })
      );
      
      console.log(`Found ${memberDetails.length} members for chit group ${chitGroupId}`);
      res.json(memberDetails);
    } catch (error) {
      console.error("Error fetching chit group members:", error);
      res.status(500).json({ message: "Failed to fetch chit group members" });
    }
  });

  app.post("/api/chitgroups/:id/members", isManager, async (req, res) => {
    try {
      const chitGroupId = parseInt(req.params.id);
      const chitGroup = await storage.getChitGroup(chitGroupId);
      
      if (!chitGroup) {
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      // Only the manager who created the chit group can add members
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const managerId = req.user.id;
      if (chitGroup.createdBy !== managerId) {
        console.log(`Security check: Manager ${managerId} attempted to add member to chit group ${chitGroupId} created by manager ${chitGroup.createdBy}`);
        return res.status(403).json({ message: "You can only add members to chit groups you've created" });
      }
      
      const { data, error } = validateRequest(req, insertChitGroupMemberSchema);
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Check if user exists
      const user = await storage.getUser(data.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only customers managed by this manager can be added to the group
      if (user.role === "customer" && user.managerId !== managerId) {
        console.log(`Security check: Manager ${managerId} attempted to add customer ${user.id} with managerId ${user.managerId} to chit group`);
        return res.status(403).json({ message: "You can only add customers you manage to chit groups" });
      }
      
      // Check if user is already a member
      const members = await storage.getChitGroupMembers(chitGroupId);
      const isAlreadyMember = members.some(member => member.userId === data.userId);
      
      if (isAlreadyMember) {
        return res.status(400).json({ message: "User is already a member of this chit group" });
      }
      
      const member = await storage.addMemberToChitGroup({
        ...data,
        chitGroupId: chitGroupId
      });
      
      console.log(`Added user ${data.userId} to chit group ${chitGroupId} successfully`);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding member to chit group:", error);
      res.status(500).json({ message: "Failed to add member to chit group" });
    }
  });

  app.delete("/api/chitgroups/:groupId/members/:userId", isManager, async (req, res) => {
    try {
      const chitGroupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      
      console.log(`DELETE request to remove user ID ${userId} from chit group ID ${chitGroupId}`);
      
      const chitGroup = await storage.getChitGroup(chitGroupId);
      if (!chitGroup) {
        console.log(`Chit group ID ${chitGroupId} not found`);
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      // Only the manager who created the chit group can remove members
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const managerId = req.user.id;
      if (chitGroup.createdBy !== managerId) {
        console.log(`Security check: Manager ${managerId} attempted to remove member from chit group ${chitGroupId} created by manager ${chitGroup.createdBy}`);
        return res.status(403).json({ message: "You can only remove members from chit groups you've created" });
      }
      
      // Get user details to verify manager-customer relationship
      const user = await storage.getUser(userId);
      if (user && user.role === "customer" && user.managerId !== managerId) {
        console.log(`Security check: Manager ${managerId} attempted to remove customer ${userId} with managerId ${user.managerId} from chit group`);
        return res.status(403).json({ message: "You can only manage customers assigned to you" });
      }
      
      // Get the current members before removal for verification
      const membersBefore = await storage.getChitGroupMembers(chitGroupId);
      const memberExists = membersBefore.some(m => m.userId === userId);
      
      if (!memberExists) {
        console.log(`User ID ${userId} is not a member of chit group ID ${chitGroupId}`);
        return res.status(404).json({ message: "Member not found in this chit group" });
      }
      
      console.log(`Attempting to remove user ID ${userId} from chit group ID ${chitGroupId}`);
      const success = await storage.removeMemberFromChitGroup(chitGroupId, userId);
      
      if (!success) {
        console.log(`Failed to remove user ID ${userId} from chit group ID ${chitGroupId}`);
        return res.status(404).json({ message: "Member not found in this chit group" });
      }
      
      // Verify removal
      const membersAfter = await storage.getChitGroupMembers(chitGroupId);
      const stillMember = membersAfter.some(m => m.userId === userId);
      
      if (stillMember) {
        console.log(`WARNING: User ID ${userId} still appears to be a member of chit group ID ${chitGroupId} after removal`);
      } else {
        console.log(`Successfully removed user ID ${userId} from chit group ID ${chitGroupId}`);
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error removing member from chit group:', error);
      res.status(500).json({ message: "Failed to remove member from chit group" });
    }
  });

  // Auctions API
  app.get("/api/chitgroups/:id/auctions", isAuthenticated, async (req, res) => {
    try {
      const chitGroupId = parseInt(req.params.id);
      const chitGroup = await storage.getChitGroup(chitGroupId);
      
      if (!chitGroup) {
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      // TypeScript type assertion
      const user = (req as Request & { user: User }).user;
      
      if (user.role === "manager") {
        // Managers can only access auctions of chit groups they created
        if (chitGroup.createdBy !== user.id) {
          console.log(`Security check: Manager ${user.id} attempted to view auctions of chit group ${chitGroupId} created by manager ${chitGroup.createdBy}`);
          return res.status(403).json({ message: "You can only view auctions of chit groups you've created" });
        }
      } else {
        // If user is customer, verify they are a member
        const members = await storage.getChitGroupMembers(chitGroupId);
        const isMember = members.some(member => member.userId === user.id);
        
        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this chit group" });
        }
      }
      
      console.log(`Fetching auctions for chit group ${chitGroupId}`);
      const auctions = await storage.getAuctionsByChitGroup(chitGroupId);
      console.log(`Found ${auctions.length} auctions for chit group ${chitGroupId}`);
      res.json(auctions);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      res.status(500).json({ message: "Failed to fetch auctions" });
    }
  });

  app.post("/api/chitgroups/:id/auctions", isManager, async (req, res) => {
    try {
      const chitGroupId = parseInt(req.params.id);
      const chitGroup = await storage.getChitGroup(chitGroupId);
      
      if (!chitGroup) {
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      const { data, error } = validateRequest(req, insertAuctionSchema);
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const auction = await storage.createAuction({
        ...data,
        chitGroupId: chitGroupId
      });
      
      res.status(201).json(auction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create auction" });
    }
  });

  app.put("/api/auctions/:id", isManager, async (req, res) => {
    try {
      const auctionId = parseInt(req.params.id);
      const auction = await storage.getAuction(auctionId);
      
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      
      const { data, error } = validateRequest(req, insertAuctionSchema.partial());
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const updatedAuction = await storage.updateAuction(auctionId, data);
      res.json(updatedAuction);
    } catch (error) {
      res.status(500).json({ message: "Failed to update auction" });
    }
  });

  // Bids API
  app.get("/api/auctions/:id/bids", isAuthenticated, async (req, res) => {
    try {
      const auctionId = parseInt(req.params.id);
      const auction = await storage.getAuction(auctionId);
      
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      
      const bids = await storage.getBidsByAuction(auctionId);
      
      // Get user details for each bid
      const bidsWithUserDetails = await Promise.all(
        bids.map(async (bid) => {
          const user = await storage.getUser(bid.userId);
          return {
            ...bid,
            user: user ? {
              id: user.id,
              name: user.name
            } : null
          };
        })
      );
      
      res.json(bidsWithUserDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  app.post("/api/auctions/:id/bids", isAuthenticated, async (req, res) => {
    try {
      const auctionId = parseInt(req.params.id);
      const auction = await storage.getAuction(auctionId);
      
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      
      if (auction.status !== "scheduled") {
        return res.status(400).json({ message: "Cannot place bid on a completed or cancelled auction" });
      }
      
      // TypeScript type assertion
      const user = (req as Request & { user: User }).user;
      
      // If user is customer, verify they are a member of the chit group
      if (user.role === "customer") {
        const members = await storage.getChitGroupMembers(auction.chitGroupId);
        const isMember = members.some(member => member.userId === user.id);
        
        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this chit group" });
        }
      }
      
      const { data, error } = validateRequest(req, insertBidSchema);
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const bid = await storage.createBid({
        ...data,
        auctionId: auctionId,
        userId: user.id
      });
      
      res.status(201).json(bid);
    } catch (error) {
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  // Payments API
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      // TypeScript type assertion
      const user = (req as Request & { user: User }).user;
      
      let payments = [];
      
      if (user.role === "manager") {
        console.log(`Manager ${user.id} requesting payments`);
        
        // Get all payments or filter by chitGroup if query param is provided
        const chitGroupId = req.query.chitGroupId ? parseInt(req.query.chitGroupId as string) : null;
        
        if (chitGroupId) {
          // Verify the manager created this chit group
          const chitGroup = await storage.getChitGroup(chitGroupId);
          if (!chitGroup) {
            return res.status(404).json({ message: "Chit group not found" });
          }
          
          if (chitGroup.createdBy !== user.id) {
            console.log(`Security check: Manager ${user.id} attempted to access payments for chit group ${chitGroupId} created by manager ${chitGroup.createdBy}`);
            return res.status(403).json({ message: "You can only access payments for chit groups you've created" });
          }
          
          console.log(`Getting payments for specific chit group ${chitGroupId}`);
          payments = await storage.getPaymentsByChitGroup(chitGroupId);
        } else {
          // Get all payments for chit groups created by this manager
          console.log(`Getting payments for all chit groups created by manager ${user.id}`);
          const allChitGroups = await storage.getAllChitGroups();
          const managerChitGroups = allChitGroups.filter(group => group.createdBy === user.id);
          
          console.log(`Manager ${user.id} has ${managerChitGroups.length} chit groups`);
          
          for (const group of managerChitGroups) {
            const groupPayments = await storage.getPaymentsByChitGroup(group.id);
            console.log(`Found ${groupPayments.length} payments for chit group ${group.id}`);
            payments.push(...groupPayments);
          }
        }
      } else {
        // Customers can only see their own payments
        console.log(`Getting payments for customer ${user.id}`);
        payments = await storage.getPaymentsByUser(user.id);
        console.log(`Found ${payments.length} payments for customer ${user.id}`);
      }
      
      // Get chit group and user details for each payment
      const paymentsWithDetails = await Promise.all(
        payments.map(async (payment) => {
          const chitGroup = await storage.getChitGroup(payment.chitGroupId);
          const paymentUser = await storage.getUser(payment.userId);
          
          return {
            ...payment,
            chitGroup: chitGroup ? {
              id: chitGroup.id,
              name: chitGroup.name
            } : null,
            user: paymentUser ? {
              id: paymentUser.id,
              name: paymentUser.name
            } : null
          };
        })
      );
      
      console.log(`Returning ${paymentsWithDetails.length} payments`);
      res.json(paymentsWithDetails);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", isManager, async (req, res) => {
    try {
      const { data, error } = validateRequest(req, insertPaymentSchema);
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Check if chit group exists
      const chitGroup = await storage.getChitGroup(data.chitGroupId);
      if (!chitGroup) {
        return res.status(404).json({ message: "Chit group not found" });
      }
      
      // Check if user exists and is a member
      const user = await storage.getUser(data.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const members = await storage.getChitGroupMembers(data.chitGroupId);
      const isMember = members.some(member => member.userId === data.userId);
      
      if (!isMember) {
        return res.status(400).json({ message: "User is not a member of this chit group" });
      }
      
      const payment = await storage.createPayment(data);
      
      // Create notification for the user
      await storage.createNotification({
        userId: data.userId,
        message: `Your payment of ₹${data.amount} for ${chitGroup.name}, month ${data.monthNumber} has been recorded as ${data.status}.`,
        type: "payment"
      });
      
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.put("/api/payments/:id", isManager, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const payment = await storage.updatePayment(paymentId, req.body);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

  // Notifications API
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      // TypeScript type assertion
      const user = (req as Request & { user: User }).user;
      
      const notifications = await storage.getNotificationsByUser(user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Users API
  app.get("/api/customers", isManager, async (req, res) => {
    try {
      // The isManager middleware ensures req.user exists and is a manager
      // But we'll add a type guard to satisfy TypeScript
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get customers managed by the current manager
      const managerId = req.user.id;
      console.log(`getCustomersByManager: Finding customers with managerId=${managerId}`);
      const managedCustomers = await storage.getCustomersByManager(managerId);
      
      // Remove sensitive information like password hashes
      const sanitizedCustomers = managedCustomers.map(customer => {
        const { password, ...customerWithoutPassword } = customer;
        return customerWithoutPassword;
      });
      
      console.log(`getCustomersByManager: Returning ${sanitizedCustomers.length} customers for manager ID ${managerId}`);
      res.json(sanitizedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });
  
  // Create customer (by manager)
  app.post("/api/customers", isManager, async (req, res) => {
    try {
      // Import needed modules
      const { insertUserSchema } = await import("@shared/schema");
      const { z } = await import("zod");
      
      const validateSchema = insertUserSchema.extend({
        isFirstLogin: z.boolean().default(true),
      });
      
      const { data, error } = validateRequest(req, validateSchema);
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Import the crypto module for password hashing
      const crypto = await import("crypto");
      const { promisify } = await import("util");
      const randomBytes = crypto.randomBytes;
      const scryptAsync = promisify(crypto.scrypt);
      
      const hashPassword = async (password: string) => {
        const salt = randomBytes(16).toString("hex");
        const buf = await scryptAsync(password, salt, 64) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
      };
      
      // Create the customer with the current manager as their manager
      // TypeScript check
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const managerId = req.user.id; // Get the current manager's ID
      
      const user = await storage.createUser({
        ...data,
        role: "customer", // Force role to customer
        managerId, // Set the current manager as this customer's manager
        password: await hashPassword(data.password),
      });
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });
  
  // Password reset for first-time login
  app.post("/api/users/:userId/reset-password", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { currentPassword, newPassword } = req.body;
      
      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Import crypto modules for password handling
      const crypto = await import("crypto");
      const { promisify } = await import("util");
      const randomBytes = crypto.randomBytes;
      const scryptAsync = promisify(crypto.scrypt);
      
      // Password comparison function
      const comparePasswords = async (supplied: string, stored: string) => {
        const [hashed, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
        return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
      };
      
      // Verify current password
      const passwordCorrect = await comparePasswords(currentPassword, user.password);
      if (!passwordCorrect) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashPassword = async (password: string) => {
        const salt = randomBytes(16).toString("hex");
        const buf = await scryptAsync(password, salt, 64) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
      };
      
      // Update the user's password and set isFirstLogin to false
      await storage.updateUser(userId, {
        password: await hashPassword(newPassword),
        isFirstLogin: false,
      });
      
      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
