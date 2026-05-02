import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      avatar
      bio
      timezone
      isVerified
      isGuest
      createdAt
      availability {
        day
        startMinute
        endMinute
      }
      skills {
        id
        title
        description
        category
        type
        proficiencyLevel
        isActive
        portfolios {
          id
          title
          description
          url
          type
        }
      }
    }
  }
`;

export const GET_MY_SKILLS = gql`
  query GetMySkills {
    mySkills {
      id
      title
      description
      category
      type
      proficiencyLevel
      isActive
      createdAt
      portfolios {
        id
        title
        url
        type
      }
    }
  }
`;

export const GET_USER_BY_USERNAME = gql`
  query GetUserByUsername($identifier: String!) {
    userByUsername(identifier: $identifier) {
      id
      name
      email
      avatar
      bio
      timezone
      isVerified
      createdAt
      skills {
        id
        title
        description
        category
        type
        proficiencyLevel
        portfolios {
          id
          title
          description
          url
          type
        }
      }
    }
  }
`;

export const GET_USER_STATS = gql`
  query GetUserStats($userId: String!) {
    userStats(userId: $userId) {
      reviewCount
      averageRating
      sessionsCompleted
      skillsOffered
      skillsWanted
      portfolioCount
      trustScore
      trustBreakdown {
        reviewSignal
        sessionSignal
        portfolioSignal
      }
    }
  }
`;

export const GET_MY_SESSIONS = gql`
  query GetMySessions {
    mySessions {
      id
      status
      scheduledAt
      duration
      format
      meetingLink
      summary
      p1Completed
      p2Completed
      checkpoints
      participant1Id
      participant2Id
      participant1 { id name avatar }
      participant2 { id name avatar }
      skill1 { id title category }
      skill2 { id title category }
      createdAt
      updatedAt
    }
  }
`;

export const GET_MY_MATCH_REQUESTS = gql`
  query GetMyMatchRequests($type: String!, $pagination: PaginationInput) {
    myMatchRequests(type: $type, pagination: $pagination) {
      items {
        id
        status
        message
        createdAt
        fromUser { id name avatar }
        toUser { id name avatar }
        offeredSkill { id title category }
        wantedSkill { id title category }
        session { id status }
      }
      meta {
        totalItems
        totalPages
        currentPage
      }
    }
  }
`;

export const GET_SUGGESTED_MATCHES = gql`
  query GetSuggestedMatches {
    suggestedMatches {
      id
      score
      reason
      matchedWantSkillId
      matchedWantSkillTitle
      skill {
        id
        title
        description
        category
        type
        proficiencyLevel
        user {
          id
          name
          email
          avatar
        }
        portfolios {
          id
          title
          url
          type
        }
      }
      affinityBreakdown {
        semanticScore
        categoryScore
        depthBoost
      }
    }
  }
`;

export const SEARCH_SKILLS = gql`
  query SearchSkills($query: String, $category: String, $type: String, $pagination: PaginationInput) {
    searchSkills(query: $query, category: $category, type: $type, pagination: $pagination) {
      items {
        id
        title
        description
        category
        type
        proficiencyLevel
        user {
          id
          name
          email
          avatar
          trustScore
          reviewCount
        }
        portfolios {
          id
          title
          url
          type
        }
      }
      meta {
        totalItems
        totalPages
        currentPage
      }
    }
  }
`;

export const GET_SESSION = gql`
  query GetSession($id: String!) {
    session(id: $id) {
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
      roadmap
      suggestedResources
      participant1Id
      participant2Id
      participant1 {
        id
        name
        avatar
        email
        timezone
        availability {
          day
          startMinute
          endMinute
        }
      }
      participant2 {
        id
        name
        avatar
        email
        timezone
        availability {
          day
          startMinute
          endMinute
        }
      }
      skill1 {
        id
        title
        category
        description
        proficiencyLevel
        portfolios {
          id
          title
          url
          type
        }
      }
      skill2 {
        id
        title
        category
        description
        proficiencyLevel
        portfolios {
          id
          title
          url
          type
        }
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($sessionId: String!) {
    messages(sessionId: $sessionId) {
      id
      content
      senderId
      createdAt
      isRead
      sender { id name avatar }
    }
  }
`;

export const GET_USER_REVIEWS = gql`
  query GetUserReviews($userId: String!) {
    userReviews(userId: $userId) {
      id
      rating
      comment
      createdAt
      reviewer { id name avatar }
    }
  }
`;

export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications {
    myNotifications {
      id
      type
      title
      message
      isRead
      relatedId
      createdAt
    }
  }
`;
