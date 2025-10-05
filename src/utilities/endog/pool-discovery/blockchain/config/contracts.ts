// Uniswap V4 PoolManager ABI - Initialize event
export const POOL_MANAGER_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "currency0",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "currency1",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint24",
        "name": "fee",
        "type": "uint24"
      },
      {
        "indexed": false,
        "internalType": "int24",
        "name": "tickSpacing",
        "type": "int24"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "hooks",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint160",
        "name": "sqrtPriceX96",
        "type": "uint160"
      },
      {
        "indexed": false,
        "internalType": "int24",
        "name": "tick",
        "type": "int24"
      }
    ],
    "name": "Initialize",
    "type": "event"
  }
];

export const POOL_MANAGER_ADDRESS = '0x1f98400000000000000000000000000000000004';
