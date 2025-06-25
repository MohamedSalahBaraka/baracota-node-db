# TypeScript ORM Package

A modern, type-safe ORM for Node.js with support for MySQL and SQLite databases, featuring:

- **TypeScript-first design** - Full type safety throughout your data layer
- **Multi-database support** - Works with MySQL and SQLite (easily extensible)
- **Active Record pattern** - Simple model definitions with relationships
- **Declarative syntax** - Decorator-based model configuration
- **Transactions** - Easy transaction management
- **Soft deletes** - Non-destructive deletion with recovery
- **Hooks/validation** - Lifecycle hooks and data validation

## Installation

```bash
npm install baracota-node-db mysql2  # For MySQL
# or
npm install baracota-node-db sqlite3 # For SQLite
```

## Quick Start

### 1. Initialize the ORM

```typescript
import { initORM } from 'baracota-node-db';

// Initialize with MySQL
await initORM({
  client: 'mysql',
  connection: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'test'
  }
});

// Or with SQLite
await initORM({
  client: 'sqlite',
  connection: {
    filename: './database.sqlite'
  }
});
```

### 2. Define a Model

#### Using Decorators (Recommended)

```typescript
import { Model, PrimaryKey, Fields, HasMany } from 'baracota-node-db';

@Model('users')
@Fields(['id', 'name', 'email'])
class User extends BaseModel {
  @PrimaryKey('user_id')
  id: number;

  @HasMany()
  posts: Post[];
}

@Model('posts')
@Fields(['id', 'title', 'content', 'user_id'])
class Post extends BaseModel {
  // Model methods...
}
```

#### Using Traditional Syntax

```typescript
class User extends BaseModel {
  protected table = 'users';
  protected primaryKey = 'id';
  protected allowedFields = ['id', 'name', 'email'];
  
  // Define relationships
  static {
    this.hasMany(Post, 'user_id');
  }
}
```

### 3. Use Your Models

```typescript
// Create a user
const userId = await User.insert({
  name: 'John Doe',
  email: 'john@example.com'
});

// Find with relationships
const user = await User.with('posts').find(userId);
console.log(user.posts);

// Complex query
const activeUsers = await User
  .where('status', 'active')
  .where('created_at', '>', new Date('2023-01-01'))
  .orderBy('name', 'ASC')
  .limit(10)
  .get();

// Transaction
await transaction(async (trx) => {
  const user = new User(trx);
  const post = new Post(trx);
  
  const userId = await user.insert({ name: 'Alice' });
  await post.insert({ title: 'First Post', user_id: userId });
});
```

## Key Features

### Database Support

| Feature       | MySQL | SQLite |
|--------------|-------|--------|
| CRUD         | ✅    | ✅     |
| Transactions | ✅    | ✅     |
| Relations    | ✅    | ✅     |
| Soft Deletes | ✅    | ✅     |

### Decorator Reference

| Decorator       | Description                          | Example                      |
|-----------------|--------------------------------------|------------------------------|
| `@Model()`      | Defines table name                   | `@Model('users')`            |
| `@Fields()`     | Whitelists allowed fields            | `@Fields(['id', 'name'])`    |
| `@PrimaryKey()` | Specifies primary key                | `@PrimaryKey('user_id')`     |
| `@HasMany()`    | Defines 1-to-many relationship       | `@HasMany()`                 |
| `@BelongsTo()`  | Defines many-to-1 relationship       | `@BelongsTo()`               |
| `@BeforeCreate` | Lifecycle hook before creation       | `@BeforeCreate()`            |

### Query Methods

```typescript
// Basic queries
Model.find(id)
Model.findAll()
Model.insert(data)
Model.update(id, data)
Model.delete(id)

// Query builder
Model.where(field, value)
Model.whereIn(field, values)
Model.orderBy(field, direction)
Model.limit(count)
Model.offset(count)

// Advanced
Model.with(relations) // Eager load
Model.transaction(callback) // Run in transaction
Model.softDelete() // Mark as deleted
Model.restore() // Unmark as deleted
```

## Configuration Options

Initialize with these options:

```typescript
await initORM({
  client: 'mysql' | 'sqlite',
  connection: {
    // MySQL
    host?: string,
    user?: string,
    password?: string,
    database?: string,
    port?: number,
    
    // SQLite
    filename?: string
  },
  pool?: {
    min?: number,
    max?: number
  },
  modelDefaults?: {
    timestamps?: boolean,
    createdAt?: string,
    updatedAt?: string,
    softDeletes?: boolean,
    deletedAt?: string
  }
});
```

## Testing

```typescript
// Test setup
beforeAll(async () => {
  await initORM({
    client: 'sqlite',
    connection: { filename: ':memory:' } // In-memory database
  });
});

// Example test
test('create user', async () => {
  const id = await User.insert({ name: 'Test' });
  const user = await User.find(id);
  expect(user.name).toBe('Test');
});
```

## Migration Guide

### From v1 to v2

1. Replace direct `BaseModel.initialize()` with `initORM()`
2. Update config format to new structure
3. Decorators are now optional but recommended

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/fooBar`)
3. Commit changes (`git commit -am 'Add some fooBar'`)
4. Push to branch (`git push origin feature/fooBar`)
5. Create new Pull Request

## License

MIT © M.S.B
