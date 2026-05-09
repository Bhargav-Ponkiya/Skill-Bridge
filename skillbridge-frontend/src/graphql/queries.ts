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
      swappedCount
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
      trustScore
      reviewCount
      createdAt
      skills {
        id
        title
        description
        category
        type
        proficiencyLevel
        swappedCount
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
        endorsementSignal
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
      version
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
      reciprocalScore
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

export const GET_SUGGESTED_MATCHES_EXPLORE = gql`
  query GetSuggestedMatchesExplore($filter: SuggestedMatchesFilterInput) {
    suggestedMatchesExplore(filter: $filter) {
      items {
        id
        score
        reason
        matchedWantSkillId
        matchedWantSkillTitle
        reciprocalScore
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
      meta {
        totalItems
        itemCount
        itemsPerPage
        totalPages
        currentPage
      }
    }
  }
`;

export const SEARCH_SKILLS = gql`
  query SearchSkills($query: String, $category: String, $type: String, $pagination: CursorPaginationInput) {
    searchSkills(query: $query, category: $category, type: $type, pagination: $pagination) {
      edges {
        node {
          id
          title
          description
          category
          type
          proficiencyLevel
          swappedCount
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
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
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
      version
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
      sessionId
      rating
      comment
      createdAt
      reviewer { id name avatar }
    }
  }
`;

export const SKILL_REVIEWS = gql`
  query SkillReviews($userId: String!, $skillId: String!) {
    skillReviews(userId: $userId, skillId: $skillId) {
      id
      sessionId
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
