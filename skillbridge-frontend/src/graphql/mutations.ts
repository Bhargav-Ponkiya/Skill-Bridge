import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        name
        email
        avatar
      }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user {
        id
        name
        email
      }
    }
  }
`;

export const GUEST_LOGIN = gql`
  mutation GuestLogin {
    guestLogin {
      accessToken
      user {
        id
        name
        email
        isGuest
      }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      bio
      avatar
      timezone
    }
  }
`;

export const ADD_SKILL = gql`
  mutation AddSkill($input: CreateSkillInput!) {
    addSkill(input: $input) {
      id
      title
      description
      category
      type
      proficiencyLevel
      isActive
    }
  }
`;

export const UPDATE_SKILL = gql`
  mutation UpdateSkill($id: String!, $input: UpdateSkillInput!) {
    updateSkill(id: $id, input: $input) {
      id
      title
      description
      category
      type
      proficiencyLevel
      isActive
    }
  }
`;

export const DELETE_SKILL = gql`
  mutation DeleteSkill($id: String!) {
    deleteSkill(id: $id)
  }
`;

export const TOGGLE_SKILL_ACTIVE = gql`
  mutation ToggleSkillActive($id: String!) {
    toggleSkillActive(id: $id) {
      id
      isActive
    }
  }
`;

export const SEND_MATCH_REQUEST = gql`
  mutation SendMatchRequest($input: CreateMatchRequestInput!) {
    sendMatchRequest(input: $input) {
      id
      status
    }
  }
`;

export const RESPOND_TO_MATCH_REQUEST = gql`
  mutation RespondToMatchRequest($requestId: String!, $accept: Boolean!) {
    respondToMatchRequest(requestId: $requestId, accept: $accept) {
      id
      status
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($input: CreateMessageInput!) {
    sendMessage(input: $input) {
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

export const SET_TYPING = gql`
  mutation SetTyping($sessionId: String!, $isTyping: Boolean!) {
    setTyping(sessionId: $sessionId, isTyping: $isTyping)
  }
`;

export const MARK_SESSION_READ = gql`
  mutation MarkSessionRead($sessionId: String!) {
    markSessionRead(sessionId: $sessionId)
  }
`;

export const SET_AVAILABILITY = gql`
  mutation SetAvailability($slots: [AvailabilitySlotInput!]!) {
    setAvailability(slots: $slots) {
      day
      startMinute
      endMinute
    }
  }
`;

export const CREATE_REVIEW = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      comment
    }
  }
`;

export const ADD_PORTFOLIO = gql`
  mutation AddPortfolio($input: AddPortfolioInput!) {
    addPortfolio(input: $input) {
      id
      title
      description
      url
      type
    }
  }
`;

export const REMOVE_PORTFOLIO = gql`
  mutation RemovePortfolio($id: String!) {
    removePortfolio(id: $id)
  }
`;

export const UPDATE_PORTFOLIO = gql`
  mutation UpdatePortfolio($id: String!, $input: UpdatePortfolioInput!) {
    updatePortfolio(id: $id, input: $input) {
      id
      title
      description
      url
      type
    }
  }
`;

export const UPDATE_SESSION = gql`
  mutation UpdateSession($id: String!, $input: UpdateSessionInput!) {
    updateSession(id: $id, input: $input) {
      id
      scheduledAt
      duration
      format
      meetingLink
    }
  }
`;

export const CHANGE_SESSION_STATUS = gql`
  mutation ChangeSessionStatus($id: String!, $status: SessionStatus!) {
    changeSessionStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const TOGGLE_SESSION_PROGRESS = gql`
  mutation ToggleSessionProgress($id: String!) {
    toggleSessionProgress(id: $id) {
      id
      p1Completed
      p2Completed
      status
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;
