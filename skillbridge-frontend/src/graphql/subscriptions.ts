import { gql } from '@apollo/client';

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription OnMessageAdded($sessionId: String!) {
    messageAdded(sessionId: $sessionId) {
      id
      content
      senderId
      createdAt
      isRead
      sender {
        id
        name
        avatar
      }
    }
  }
`;

export const SESSION_UPDATED_SUBSCRIPTION = gql`
  subscription OnSessionUpdated($sessionId: String!) {
    sessionUpdated(sessionId: $sessionId) {
      id
      status
      format
      meetingLink
      scheduledAt
      duration
      summary
      p1Completed
      p2Completed
      checkpoints
      updatedAt
    }
  }
`;

export const MATCH_REQUEST_UPDATED_SUBSCRIPTION = gql`
  subscription OnMatchRequestUpdated($userId: String!) {
    matchRequestUpdated(userId: $userId) {
      id
      status
      fromUserId
      toUserId
      updatedAt
    }
  }
`;

export const TYPING_CHANGED_SUBSCRIPTION = gql`
  subscription OnTypingChanged($sessionId: String!) {
    typingChanged(sessionId: $sessionId) {
      sessionId
      userId
      userName
      isTyping
    }
  }
`;
