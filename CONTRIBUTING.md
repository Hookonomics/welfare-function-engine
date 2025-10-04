# Contributing to Welfare Function Engine

Thank you for your interest in contributing to the Welfare Function Engine! This document provides guidelines and information for contributors.

## Code of Conduct

This project follows a code of conduct that we expect all contributors to follow. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a new branch for your feature/fix
5. Make your changes
6. Run tests: `npm test`
7. Build the project: `npm run build`
8. Submit a pull request

## Development Workflow

### Branch Naming
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Refactoring: `refactor/description`

### Commit Messages
Follow conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for test additions/changes
- `chore:` for maintenance tasks

Examples:
```
feat: add utility function validation
fix: resolve parameter constraint issue
docs: update API documentation
```

### Code Style

- Use TypeScript with strict mode
- Follow ESLint configuration
- Use 2 spaces for indentation
- Maximum line length: 100 characters
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing

- Write unit tests for all new functionality
- Maintain test coverage above 90%
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:
```typescript
describe('UtilityFunction', () => {
  it('should calculate utility correctly for valid inputs', () => {
    // Arrange
    const utilityFunction = new MyUtilityFunction();
    const userPosition = createMockUserPosition();
    
    // Act
    const result = utilityFunction.evaluate(userPosition, poolState, parameters);
    
    // Assert
    expect(result).toBeGreaterThan(0);
  });
});
```

## Pull Request Process

1. Ensure your branch is up to date with main
2. Run all tests and ensure they pass
3. Build the project successfully
4. Update documentation if needed
5. Fill out the pull request template
6. Request review from maintainers

### PR Requirements

- [ ] All tests pass
- [ ] Code coverage maintained
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
- [ ] Follows project coding standards
- [ ] Includes appropriate tests

## Architecture Guidelines

### Utility Functions
- Must implement `IUtilityFunction` interface
- Should be stateless and pure
- Must validate all parameters
- Should handle edge cases gracefully

### Mathematical Constraints
- All utility functions must satisfy monotonicity
- Symmetry requirements must be met
- Pareto efficiency must be maintained
- Pool invariants must be preserved

### Error Handling
- Use specific error types
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases gracefully

## Documentation

### Code Documentation
- Use JSDoc for all public APIs
- Include parameter descriptions
- Document return values
- Add usage examples

### README Updates
- Update feature lists
- Add usage examples
- Update installation instructions
- Document breaking changes

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release notes
4. Tag the release
5. Publish to npm

## Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Contact maintainers directly
- Review documentation

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to the Welfare Function Engine!
