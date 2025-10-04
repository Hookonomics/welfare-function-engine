# Welfare Function Engine

A comprehensive TypeScript framework for defining mathematically compliant welfare functions over DeFi liquidity pools.

## Overview

The Welfare Function Engine provides a robust, off-chain utility function framework that is highly customizable, abstract, and mathematically compliant. It ensures pool safety through strict parameter validation and constraint enforcement.

## Features

- **Utility Function Interface**: Generic, abstract interface for all utility functions
- **Mathematical Compliance**: Built-in validation for monotonicity, symmetry, and Pareto efficiency
- **Pool Safety**: Parameter constraints prevent pool invariant breakage
- **TypeScript Support**: Full type safety and IntelliSense support
- **Comprehensive Testing**: Jest test suite with 100% coverage
- **Extensible Architecture**: Plugin system for custom utility functions

## Project Structure

```
src/
├── utilities/
│   ├── interfaces/
│   │   ├── IUtilityFunction.ts    # Core utility function interface
│   │   ├── UtilityTemplate.ts     # Template interface
│   │   └── index.ts               # Interface exports
│   └── index.ts                   # Main utilities module
tests/
├── utilities/
│   └── interfaces/
│       └── IUtilityFunction.test.ts
└── setup.ts
```

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Development mode
npm run dev

# Clean build artifacts
npm run clean
```

## Usage

```typescript
import { IUtilityFunction } from './src/utilities/interfaces';

// Implement your custom utility function
class MyUtilityFunction implements IUtilityFunction {
  evaluate(userPosition: UserPosition, poolState: PoolState, parameters: UtilityParameters): number {
    // Your utility calculation logic
    return 0;
  }
  
  // ... implement other required methods
}
```

## Architecture

The framework follows a layered architecture:

1. **Utility Function Foundation**: Core interfaces and validation
2. **Welfare Function Layer**: Higher-level welfare function composition
3. **Pool Integration**: DeFi pool-specific implementations

## Mathematical Constraints

All utility functions must satisfy:

- **Monotonicity**: Utility increases with beneficial changes
- **Symmetry**: Fair treatment of equivalent positions
- **Pareto Efficiency**: No improvement possible without harming others
- **Pool Invariant Preservation**: Maintains pool mathematical properties

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

ISC

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Utility Requirements](docs/utilities/docs/in/utility-requirements.md)
- [Technical Specification](docs/utilities/docs/out/utility-specification.md)
- [Implementation Plan](docs/utilities/docs/out/utility-implementation-plan.md)
- [Variable System](docs/utilities/docs/out/variable-system-specification.md)

## Status

🚧 **In Development** - Core utility function interfaces implemented
