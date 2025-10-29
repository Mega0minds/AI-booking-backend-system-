const { getFirestore } = require('../config/database');

class Conversation {
  constructor(data) {
    this.sessionId = data.sessionId || '';
    this.messages = data.messages || [];
    this.bookingInfo = data.bookingInfo || {};
    this.status = data.status || 'active'; // active, completed, cancelled
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Static method to create a new conversation
  static async create(conversationData) {
    try {
      const db = getFirestore();
      
      // Add timestamps
      const now = new Date();
      conversationData.createdAt = now;
      conversationData.updatedAt = now;
      conversationData.status = conversationData.status || 'active';

      const docRef = await db.collection('conversations').add(conversationData);
      
      return {
        id: docRef.id,
        ...conversationData
      };
    } catch (error) {
      throw new Error(`Error creating conversation: ${error.message}`);
    }
  }

  // Static method to get conversation by session ID
  static async findBySessionId(sessionId) {
    try {
      const db = getFirestore();
      const conversationsRef = db.collection('conversations');
      const snapshot = await conversationsRef.where('sessionId', '==', sessionId).limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw new Error(`Error finding conversation: ${error.message}`);
    }
  }

  // Static method to find conversation by ID
  static async findById(id) {
    try {
      const db = getFirestore();
      const doc = await db.collection('conversations').doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw new Error(`Error finding conversation: ${error.message}`);
    }
  }

  // Static method to update conversation
  static async findByIdAndUpdate(id, updateData, options = {}) {
    try {
      const db = getFirestore();
      
      // Add updatedAt timestamp
      updateData.updatedAt = new Date();
      
      const docRef = db.collection('conversations').doc(id);
      
      if (options.new) {
        // Return updated document
        await docRef.update(updateData);
        const doc = await docRef.get();
        return {
          id: doc.id,
          ...doc.data()
        };
      } else {
        // Just update without returning
        await docRef.update(updateData);
        return { id, ...updateData };
      }
    } catch (error) {
      throw new Error(`Error updating conversation: ${error.message}`);
    }
  }

  // Static method to add message to conversation
  static async addMessage(conversationId, message) {
    try {
      const db = getFirestore();
      const conversation = await this.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messages = conversation.messages || [];
      messages.push({
        ...message,
        timestamp: new Date()
      });

      await db.collection('conversations').doc(conversationId).update({
        messages,
        updatedAt: new Date()
      });

      return {
        id: conversationId,
        ...conversation,
        messages
      };
    } catch (error) {
      throw new Error(`Error adding message: ${error.message}`);
    }
  }

  // Static method to update booking info
  static async updateBookingInfo(conversationId, bookingInfo) {
    try {
      const db = getFirestore();
      
      await db.collection('conversations').doc(conversationId).update({
        bookingInfo: { ...bookingInfo },
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      throw new Error(`Error updating booking info: ${error.message}`);
    }
  }

  // Static method to complete conversation
  static async completeConversation(conversationId, finalBookingInfo = {}) {
    try {
      const db = getFirestore();
      
      await db.collection('conversations').doc(conversationId).update({
        status: 'completed',
        bookingInfo: finalBookingInfo,
        completedAt: new Date(),
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      throw new Error(`Error completing conversation: ${error.message}`);
    }
  }

  // Static method to get conversation statistics
  static async getStats() {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('conversations').get();
      
      let totalConversations = 0;
      let activeConversations = 0;
      let completedConversations = 0;
      let cancelledConversations = 0;
      
      snapshot.forEach(doc => {
        const conversation = doc.data();
        totalConversations++;
        
        switch (conversation.status) {
          case 'active':
            activeConversations++;
            break;
          case 'completed':
            completedConversations++;
            break;
          case 'cancelled':
            cancelledConversations++;
            break;
        }
      });
      
      return {
        totalConversations,
        activeConversations,
        completedConversations,
        cancelledConversations
      };
    } catch (error) {
      throw new Error(`Error getting conversation stats: ${error.message}`);
    }
  }
}

module.exports = Conversation;
