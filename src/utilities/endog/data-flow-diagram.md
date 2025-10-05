# Data Flow Diagram for Endogenous Variable Subscription System

## Overview

This document provides visual representations of the data flow and component interactions in the endogenous variable subscription system. The diagrams illustrate how data moves from blockchain events to client applications through various system components.

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Blockchain Layer"
        BC[Blockchain Events]
        UNI[Uniswap V3 Factory]
        POOL[Pool Contracts]
    end
    
    subgraph "Indexing Layer"
        GRAPH[The Graph Protocol]
        SUBGRAPH[Subgraph]
    end
    
    subgraph "Processing Layer"
        DISCOVERY[Pool Discovery Service]
        CALC[Efficiency Calculator]
        TEMP[Temporal Calculator]
    end
    
    subgraph "Storage Layer"
        TSDB[(TimescaleDB)]
        CACHE[(Redis Cache)]
    end
    
    subgraph "Communication Layer"
        WS[WebSocket Server]
        API[REST API]
    end
    
    subgraph "Client Layer"
        WEB[Web Client]
        MOBILE[Mobile App]
        API_CLIENT[API Client]
    end
    
    BC --> UNI
    UNI --> POOL
    POOL --> GRAPH
    GRAPH --> SUBGRAPH
    SUBGRAPH --> DISCOVERY
    DISCOVERY --> CALC
    CALC --> TEMP
    TEMP --> TSDB
    TSDB --> CACHE
    CACHE --> WS
    CACHE --> API
    WS --> WEB
    WS --> MOBILE
    API --> API_CLIENT
```

## Subscription Flow Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Server
    participant PS as Pool Discovery Service
    participant GRAPH as The Graph
    participant CALC as Efficiency Calculator
    participant DB as TimescaleDB
    participant BC as Blockchain

    C->>WS: Subscribe to variable
    WS->>PS: Create subscription
    PS->>GRAPH: Query existing pools
    GRAPH-->>PS: Return matching pools
    PS->>CALC: Start monitoring pools
    CALC->>DB: Store initial snapshots
    WS-->>C: Send subscription confirmation

    Note over BC: New pool created
    BC->>GRAPH: PoolCreated event
    GRAPH->>PS: Notify new pool
    PS->>PS: Check token pair match
    PS->>CALC: Auto-subscribe to pool
    CALC->>DB: Store pool tracking
    PS->>WS: Notify new pool discovery
    WS-->>C: Send new pool notification

    Note over BC: Pool state update
    BC->>GRAPH: Pool state change
    GRAPH->>CALC: Pool state update
    CALC->>CALC: Calculate efficiency
    CALC->>DB: Store snapshot
    CALC->>WS: Broadcast update
    WS-->>C: Send efficiency update
```

## Real-Time Update Flow

```mermaid
graph LR
    subgraph "Data Sources"
        A[Pool State Change]
        B[Historical Data]
        C[Configuration]
    end
    
    subgraph "Processing Pipeline"
        D[Determinant Calculator]
        E[Temporal Calculator]
        F[Efficiency Engine]
        G[Validation]
    end
    
    subgraph "Storage & Distribution"
        H[TimescaleDB]
        I[Cache]
        J[WebSocket]
        K[Client]
    end
    
    A --> D
    B --> E
    C --> F
    D --> F
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
```

## Pool Discovery Process

```mermaid
flowchart TD
    A[PoolCreated Event] --> B[Extract Pool Info]
    B --> C[Normalize Token Pair]
    C --> D[Query Subscriptions]
    D --> E{Match Found?}
    E -->|Yes| F[Create Pool Tracking]
    E -->|No| G[Log Event]
    F --> H[Initialize Monitoring]
    H --> I[Notify Clients]
    I --> J[Start Real-Time Updates]
    G --> K[End]
    J --> K
```

## Data Storage Architecture

```mermaid
erDiagram
    ENDOGENOUS_VARIABLE ||--o{ POOL_TRACKING : "has"
    POOL_TRACKING ||--o{ VARIABLE_SNAPSHOT : "tracks"
    POOL ||--o{ POOL_TRACKING : "monitored by"
    TOKEN ||--o{ ENDOGENOUS_VARIABLE : "token0"
    TOKEN ||--o{ ENDOGENOUS_VARIABLE : "token1"
    
    ENDOGENOUS_VARIABLE {
        string id PK
        string variableType
        string token0 FK
        string token1 FK
        json parameters
        timestamp createdAt
        boolean isActive
    }
    
    POOL_TRACKING {
        string id PK
        string poolId FK
        string variableId FK
        boolean isActive
        timestamp firstSnapshotAt
        timestamp lastSnapshotAt
        bigint snapshotCount
    }
    
    VARIABLE_SNAPSHOT {
        string id PK
        string poolTrackingId FK
        timestamp time
        decimal value
        json determinants
        json poolState
        bigint blockNumber
    }
    
    POOL {
        string id PK
        string token0 FK
        string token1 FK
        int feeTier
        decimal liquidity
        decimal sqrtPrice
        int tick
    }
    
    TOKEN {
        string id PK
        string symbol
        string name
        int decimals
    }
```

## WebSocket Message Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Server
    participant AUTH as Auth Service
    participant SUB as Subscription Manager
    participant CALC as Calculator
    participant DB as Database

    C->>WS: Connect
    WS->>AUTH: Validate Token
    AUTH-->>WS: Auth Result
    WS-->>C: Connection Established

    C->>WS: Subscribe Request
    WS->>SUB: Process Subscription
    SUB->>DB: Store Subscription
    SUB->>CALC: Start Monitoring
    WS-->>C: Subscription Confirmed

    Note over CALC: Pool State Update
    CALC->>CALC: Calculate Efficiency
    CALC->>DB: Store Snapshot
    CALC->>WS: Broadcast Update
    WS-->>C: Efficiency Update

    Note over CALC: New Pool Discovered
    CALC->>SUB: New Pool Event
    SUB->>CALC: Auto-Subscribe
    SUB->>WS: Notify Discovery
    WS-->>C: New Pool Notification
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Process Event] --> B{Valid?}
    B -->|Yes| C[Calculate Efficiency]
    B -->|No| D[Log Error]
    C --> E{Calculation Success?}
    E -->|Yes| F[Store Snapshot]
    E -->|No| G[Handle Calculation Error]
    F --> H[Broadcast Update]
    G --> I[Retry with Simplified Config]
    I --> J{Retry Success?}
    J -->|Yes| F
    J -->|No| K[Mark Pool as Failed]
    D --> L[Send Error Notification]
    K --> L
    H --> M[End]
    L --> M
```

## Performance Optimization Flow

```mermaid
graph TB
    subgraph "Input Layer"
        A[Pool State Updates]
        B[Historical Data]
    end
    
    subgraph "Caching Layer"
        C[Determinant Cache]
        D[Efficiency Cache]
        E[Configuration Cache]
    end
    
    subgraph "Processing Layer"
        F[Batch Processor]
        G[Parallel Calculator]
        H[Optimized Queries]
    end
    
    subgraph "Output Layer"
        I[WebSocket Broadcast]
        J[Database Storage]
    end
    
    A --> C
    B --> D
    C --> F
    D --> F
    E --> F
    F --> G
    G --> H
    H --> I
    H --> J
```

## Monitoring and Health Check Flow

```mermaid
sequenceDiagram
    participant M as Monitoring Service
    participant D as Discovery Service
    participant C as Calculator
    participant DB as Database
    participant WS as WebSocket
    participant A as Alerting

    M->>D: Check Discovery Health
    D-->>M: Discovery Status
    M->>C: Check Calculator Health
    C-->>M: Calculator Status
    M->>DB: Check Database Health
    DB-->>M: Database Status
    M->>WS: Check WebSocket Health
    WS-->>M: WebSocket Status
    
    M->>M: Aggregate Health Status
    alt System Healthy
        M->>A: Send Health OK
    else System Degraded
        M->>A: Send Degraded Alert
    else System Unhealthy
        M->>A: Send Critical Alert
    end
```

## Data Retention and Cleanup Flow

```mermaid
flowchart TD
    A[Scheduled Cleanup] --> B[Check Retention Policies]
    B --> C{Data Age > Retention Period?}
    C -->|Yes| D[Mark for Deletion]
    C -->|No| E[Keep Data]
    D --> F[Archive Old Data]
    F --> G[Delete Raw Data]
    G --> H[Update Aggregates]
    H --> I[Log Cleanup Stats]
    E --> J[End]
    I --> J
```

## Security and Access Control Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Server
    participant AUTH as Auth Service
    participant RBAC as RBAC Service
    participant SUB as Subscription Service
    participant CALC as Calculator

    C->>WS: Request with Token
    WS->>AUTH: Validate Token
    AUTH-->>WS: Token Valid
    WS->>RBAC: Check Permissions
    RBAC-->>WS: Permission Granted
    WS->>SUB: Process Request
    SUB->>CALC: Start Calculation
    CALC-->>SUB: Calculation Result
    SUB-->>WS: Response
    WS-->>C: Authorized Response
```

## Scalability and Load Balancing

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Load Balancer]
    end
    
    subgraph "WebSocket Servers"
        WS1[WebSocket Server 1]
        WS2[WebSocket Server 2]
        WS3[WebSocket Server 3]
    end
    
    subgraph "Processing Servers"
        P1[Processing Server 1]
        P2[Processing Server 2]
        P3[Processing Server 3]
    end
    
    subgraph "Database Cluster"
        DB1[(TimescaleDB Primary)]
        DB2[(TimescaleDB Replica)]
        DB3[(TimescaleDB Replica)]
    end
    
    LB --> WS1
    LB --> WS2
    LB --> WS3
    WS1 --> P1
    WS2 --> P2
    WS3 --> P3
    P1 --> DB1
    P2 --> DB2
    P3 --> DB3
```

## Component Interaction Matrix

| Component | Input | Output | Dependencies |
|-----------|-------|--------|-------------|
| Pool Discovery Service | Blockchain Events | Pool Info | The Graph Protocol |
| Efficiency Calculator | Pool State | Efficiency Value | Configuration, Historical Data |
| Temporal Calculator | Historical Snapshots | Growth Rates | Database |
| WebSocket Server | Client Requests | Real-time Updates | Subscription Manager |
| Database | Snapshots | Historical Data | TimescaleDB |
| Cache | Frequent Queries | Cached Results | Redis |

## Data Volume Estimates

### Daily Data Volume
- **Pool State Updates**: ~1M events/day
- **Efficiency Calculations**: ~100K calculations/day
- **WebSocket Messages**: ~10M messages/day
- **Database Writes**: ~1M snapshots/day
- **Storage Growth**: ~10GB/day

### Performance Targets
- **Latency**: <100ms for real-time updates
- **Throughput**: 10,000+ concurrent connections
- **Availability**: 99.9% uptime
- **Data Retention**: 30 days raw, 5 years aggregated
- **Cache Hit Rate**: >90% for frequent queries

## Monitoring Metrics

### Key Performance Indicators
- **Event Processing Rate**: Events/second
- **Calculation Latency**: Average calculation time
- **WebSocket Connection Count**: Active connections
- **Database Query Performance**: Query execution time
- **Error Rate**: Failed operations percentage
- **Cache Hit Rate**: Cache effectiveness
- **Memory Usage**: System resource utilization
- **Network Bandwidth**: Data transfer rates
