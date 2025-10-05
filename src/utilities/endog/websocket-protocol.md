# WebSocket Protocol for Endogenous Variable Subscriptions

## Overview

This document defines the WebSocket protocol for real-time communication between clients and the endogenous variable subscription system. The protocol handles subscription management, real-time updates, and pool discovery notifications.

## Connection Management

### 1. Connection Establishment
```typescript
// WebSocket connection URL
const wsUrl = 'wss://api.welfare-function-engine.com/endog-variables';

// Connection with authentication
const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'X-Client-Version': '1.0.0'
  }
});
```

### 2. Connection States
```typescript
enum ConnectionState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  RECONNECTING = 'reconnecting'
}
```

### 3. Heartbeat Mechanism
```typescript
// Client heartbeat to maintain connection
interface HeartbeatMessage {
  type: 'ping';
  timestamp: number;
}

// Server heartbeat response
interface HeartbeatResponse {
  type: 'pong';
  timestamp: number;
  serverTime: number;
}
```

## Message Format

### 1. Base Message Structure
```typescript
interface BaseMessage {
  id?: string;           // Optional message ID for request/response correlation
  type: string;          // Message type
  timestamp: number;      // Unix timestamp in milliseconds
  version: string;       // Protocol version
}

interface ErrorMessage extends BaseMessage {
  type: 'error';
  code: string;
  message: string;
  details?: any;
}
```

### 2. Subscription Messages

#### Subscribe Request
```typescript
interface SubscribeRequest extends BaseMessage {
  type: 'subscribe';
  variableType: string;
  token0: string;
  token1: string;
  parameters: Record<string, any>;
  options?: {
    includeHistorical?: boolean;
    historicalDays?: number;
    updateFrequency?: 'realtime' | 'minute' | 'hour';
  };
}

// Example subscription
const subscribeRequest: SubscribeRequest = {
  type: 'subscribe',
  variableType: 'volume-liquidity-efficiency',
  token0: '0xA0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C',
  token1: '0xB1c97a44F7552c9d5D1D1D1D1D1D1D1D1D1D1D1D',
  parameters: {
    volumeWeight: 0.4,
    liquidityWeight: 0.3,
    tvlWeight: 0.3,
    volumeNormalizationFactor: 1000000,
    liquidityNormalizationFactor: 1000000
  },
  options: {
    includeHistorical: true,
    historicalDays: 7,
    updateFrequency: 'realtime'
  },
  timestamp: Date.now(),
  version: '1.0.0'
};
```

#### Subscribe Response
```typescript
interface SubscribeResponse extends BaseMessage {
  type: 'subscribe_response';
  success: boolean;
  subscriptionId: string;
  matchingPools: PoolInfo[];
  error?: string;
}

interface PoolInfo {
  poolId: string;
  feeTier: number;
  liquidity: string;
  volumeUSD: string;
  totalValueLockedUSD: string;
  createdAt: number;
}
```

#### Unsubscribe Request
```typescript
interface UnsubscribeRequest extends BaseMessage {
  type: 'unsubscribe';
  subscriptionId: string;
}
```

### 3. Real-Time Update Messages

#### Variable Update
```typescript
interface VariableUpdate extends BaseMessage {
  type: 'variable_update';
  subscriptionId: string;
  poolId: string;
  variableType: string;
  value: number;
  determinants: Record<string, any>;
  poolState: {
    liquidity: string;
    sqrtPrice: string;
    tick: number;
    volumeUSD: string;
    totalValueLockedUSD: string;
    txCount: string;
  };
  calculationMetadata: {
    calculationTime: number;
    blockNumber: number;
    transactionHash?: string;
  };
}
```

#### New Pool Discovered
```typescript
interface NewPoolDiscovered extends BaseMessage {
  type: 'new_pool_discovered';
  subscriptionId: string;
  pool: {
    poolId: string;
    token0: string;
    token1: string;
    feeTier: number;
    liquidity: string;
    createdAt: number;
  };
  autoSubscribed: boolean;
}
```

#### Pool State Update
```typescript
interface PoolStateUpdate extends BaseMessage {
  type: 'pool_state_update';
  poolId: string;
  token0: string;
  token1: string;
  state: {
    liquidity: string;
    sqrtPrice: string;
    tick: number;
    volumeUSD: string;
    totalValueLockedUSD: string;
    txCount: string;
  };
  blockNumber: number;
  transactionHash: string;
}
```

### 4. Query Messages

#### Historical Data Request
```typescript
interface HistoricalDataRequest extends BaseMessage {
  type: 'historical_data_request';
  subscriptionId: string;
  poolId: string;
  fromTimestamp: number;
  toTimestamp: number;
  granularity: 'minute' | 'hour' | 'day';
}

interface HistoricalDataResponse extends BaseMessage {
  type: 'historical_data_response';
  subscriptionId: string;
  poolId: string;
  data: {
    timestamp: number;
    value: number;
    determinants: Record<string, any>;
  }[];
  metadata: {
    totalSamples: number;
    dataRange: {
      from: number;
      to: number;
    };
  };
}
```

#### Statistics Request
```typescript
interface StatisticsRequest extends BaseMessage {
  type: 'statistics_request';
  subscriptionId: string;
  timeRange: {
    from: number;
    to: number;
  };
  statistics: ('mean' | 'median' | 'stddev' | 'min' | 'max' | 'percentiles')[];
}

interface StatisticsResponse extends BaseMessage {
  type: 'statistics_response';
  subscriptionId: string;
  statistics: {
    mean: number;
    median: number;
    stddev: number;
    min: number;
    max: number;
    percentiles: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
  sampleCount: number;
}
```

## Error Handling

### 1. Error Codes
```typescript
enum ErrorCode {
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_SUBSCRIPTION = 'INVALID_SUBSCRIPTION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  VARIABLE_NOT_SUPPORTED = 'VARIABLE_NOT_SUPPORTED'
}
```

### 2. Error Response Format
```typescript
interface ErrorResponse extends BaseMessage {
  type: 'error';
  code: ErrorCode;
  message: string;
  details?: {
    field?: string;
    value?: any;
    suggestion?: string;
  };
  requestId?: string;  // ID of the request that caused the error
}
```

### 3. Error Handling Examples
```typescript
// Invalid subscription request
const errorResponse: ErrorResponse = {
  type: 'error',
  code: ErrorCode.INVALID_PARAMETERS,
  message: 'Invalid parameters for volume-liquidity-efficiency',
  details: {
    field: 'parameters.volumeWeight',
    value: 1.5,
    suggestion: 'Volume weight must be between 0 and 1'
  },
  requestId: 'req_123',
  timestamp: Date.now(),
  version: '1.0.0'
};
```

## Authentication and Authorization

### 1. JWT Token Authentication
```typescript
interface AuthMessage extends BaseMessage {
  type: 'auth';
  token: string;
}

interface AuthResponse extends BaseMessage {
  type: 'auth_response';
  success: boolean;
  permissions: string[];
  expiresAt: number;
}
```

### 2. Permission Levels
```typescript
enum Permission {
  READ_VARIABLES = 'read:variables',
  WRITE_VARIABLES = 'write:variables',
  ADMIN_VARIABLES = 'admin:variables',
  READ_HISTORICAL = 'read:historical',
  READ_STATISTICS = 'read:statistics'
}
```

## Rate Limiting

### 1. Rate Limit Headers
```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}
```

### 2. Rate Limit Response
```typescript
interface RateLimitResponse extends BaseMessage {
  type: 'rate_limit_exceeded';
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}
```

## Reconnection Strategy

### 1. Exponential Backoff
```typescript
class WebSocketClient {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1 second

  private getReconnectDelay(): number {
    return Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    const delay = this.getReconnectDelay();
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.reconnectAttempts++;
    await this.connect();
  }
}
```

### 2. Connection State Management
```typescript
class ConnectionManager {
  private subscriptions = new Map<string, SubscribeRequest>();
  private isReconnecting = false;

  async handleDisconnect(): Promise<void> {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    
    try {
      await this.reconnect();
      await this.resubscribe();
    } finally {
      this.isReconnecting = false;
    }
  }

  private async resubscribe(): Promise<void> {
    for (const [id, subscription] of this.subscriptions) {
      await this.sendMessage(subscription);
    }
  }
}
```

## Message Validation

### 1. Schema Validation
```typescript
import Joi from 'joi';

const subscribeRequestSchema = Joi.object({
  type: Joi.string().valid('subscribe').required(),
  variableType: Joi.string().required(),
  token0: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  token1: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  parameters: Joi.object().required(),
  options: Joi.object({
    includeHistorical: Joi.boolean(),
    historicalDays: Joi.number().min(1).max(30),
    updateFrequency: Joi.string().valid('realtime', 'minute', 'hour')
  }),
  timestamp: Joi.number().required(),
  version: Joi.string().required()
});

function validateMessage(message: any): { valid: boolean; error?: string } {
  const { error } = subscribeRequestSchema.validate(message);
  return {
    valid: !error,
    error: error?.message
  };
}
```

### 2. Business Logic Validation
```typescript
function validateSubscriptionRequest(request: SubscribeRequest): ValidationResult {
  const errors: string[] = [];

  // Validate token addresses
  if (request.token0 === request.token1) {
    errors.push('Token addresses must be different');
  }

  // Validate variable type
  if (!SUPPORTED_VARIABLE_TYPES.includes(request.variableType)) {
    errors.push(`Unsupported variable type: ${request.variableType}`);
  }

  // Validate parameters based on variable type
  if (request.variableType === 'volume-liquidity-efficiency') {
    const params = request.parameters;
    if (params.volumeWeight + params.liquidityWeight + params.tvlWeight !== 1) {
      errors.push('Weights must sum to 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Performance Optimization

### 1. Message Batching
```typescript
interface BatchedUpdate extends BaseMessage {
  type: 'batched_update';
  updates: VariableUpdate[];
  batchSize: number;
  batchId: string;
}
```

### 2. Compression
```typescript
// Enable compression for large messages
const ws = new WebSocket(url, {
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10,
    memLevel: 7
  }
});
```

### 3. Connection Pooling
```typescript
class ConnectionPool {
  private connections: WebSocket[] = [];
  private maxConnections = 10;

  async getConnection(): Promise<WebSocket> {
    if (this.connections.length < this.maxConnections) {
      const ws = new WebSocket(this.url);
      this.connections.push(ws);
      return ws;
    }
    
    // Return least used connection
    return this.connections[0];
  }
}
```

## Monitoring and Debugging

### 1. Connection Metrics
```typescript
interface ConnectionMetrics {
  connectedAt: number;
  messagesSent: number;
  messagesReceived: number;
  lastPing: number;
  reconnectCount: number;
  errorCount: number;
}
```

### 2. Message Logging
```typescript
class MessageLogger {
  logMessage(direction: 'in' | 'out', message: any): void {
    console.log(`[${direction.toUpperCase()}] ${JSON.stringify(message)}`);
  }
}
```

### 3. Health Checks
```typescript
interface HealthCheck extends BaseMessage {
  type: 'health_check';
  clientId: string;
  timestamp: number;
}

interface HealthCheckResponse extends BaseMessage {
  type: 'health_check_response';
  serverStatus: 'healthy' | 'degraded' | 'unhealthy';
  activeConnections: number;
  messageQueueSize: number;
}
```
