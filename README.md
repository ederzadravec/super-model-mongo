# Super Model Mongo

[English version](README.en.md)

Uma camada de serviço para Mongoose que simplifica consultas aninhadas, paginação e manipulação de subdocumentos complexos.

## Sumário

- [Visão Geral](#visão-geral)
- [Principais Recursos](#principais-recursos)
- [Instalação](#instalação)
- [Importação Rápida](#importação-rápida)
- [Exemplo Inicial](#exemplo-inicial)
- [Criando a Instância do Serviço](#criando-a-instância-do-serviço)
- [API do ServiceInstance](#api-do-serviceinstance)
  - [Operações Básicas](#operações-básicas)
  - [Utilitários](#utilitários)
  - [Operações em Caminhos](#operações-em-caminhos)
- [Sintaxe de Caminhos](#sintaxe-de-caminhos)
- [Funções Utilitárias](#funções-utilitárias)
- [Exemplos Completos](#exemplos-completos)
- [Suporte a TypeScript](#suporte-a-typescript)
- [Licença](#licença)

## Visão Geral

O Super Model Mongo encapsula um `Model` do Mongoose e fornece uma interface consistente para trabalhar com coleções MongoDB, especialmente quando há documentos aninhados ou arrays grandes que precisam de paginação.

## Principais Recursos

- CRUD com sanitização automática de dados.
- Paginação baseada em pipeline de agregação com metadados (`total`, `limit`, `page`).
- Operações em caminhos aninhados com sintaxe declarativa (`itens.id:<ObjectId>.tags`).
- Hooks opcionais de `populate` ou pós-processamento em todas as respostas.
- Helpers reutilizáveis para pipelines e updates aninhados.
- Tipos TypeScript completos para intellisense e segurança de tipos.

## Instalação

```bash
npm install @ederzadravec/super-model-mongo
# ou
yarn add @ederzadravec/super-model-mongo
```

## Importação Rápida

```typescript
// Importação padrão (recomendado)
import SuperModelMongo from '@ederzadravec/super-model-mongo';

// Importação nomeada
import { createSuperModel } from '@ederzadravec/super-model-mongo';

// Importação com tipos
import SuperModelMongo, { ServiceInstance, FindAllResponse } from '@ederzadravec/super-model-mongo';
```

## Exemplo Inicial

```typescript
import mongoose from 'mongoose';
import SuperModelMongo from '@ederzadravec/super-model-mongo';

const UserModel = mongoose.model('User', userSchema);

const userService = SuperModelMongo(UserModel);

const users = await userService.findAll(
  { name: { $regex: 'john', $options: 'i' } },
  { limit: 10, page: 1, sort: { name: 1 } }
);
```

## Criando a Instância do Serviço

```typescript
const userService = SuperModelMongo(UserModel, {
  populate: async (result) => {
    // Executado em toda resposta que retorna dados
    return result;
  },
});
```

- `model`: instância de `mongoose.Model` obrigatória.
- `defaultOptions.populate`: função assíncrona opcional usada para enriquecer ou transformar os dados antes de retorná-los.
- Retorno: um `ServiceInstance<T>` com todos os métodos listados abaixo.

## API do ServiceInstance

### Operações Básicas

#### `findOne(query?, projection?, options?)`

Localiza o primeiro documento que corresponde ao `query`.
`projection` e `options` são repassados para `model.findOne`.
Caso exista `populate`, o resultado é transformado antes do retorno.

> Retorna: `Promise<T | null>`

```typescript
const user = await userService.findOne(
  { email: 'admin@example.com' },
  { password: 0 }
);
```

**Exemplo de resposta:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "admin@example.com",
  "name": "Admin User",
  "role": "admin",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### `findAll(query?, options?)`

Executa um pipeline de agregação que aplica paginação, ordenação e projeção.
`limit` é limitado entre 1 e 100; `page` padrão é 1.
Resultado inclui `data`, `total`, `page` e `limit`.

> Retorna: `Promise<FindAllResponse<T>>`

```typescript
const { data, total, page } = await userService.findAll(
  { active: true },
  { limit: 20, page: 2, sort: { createdAt: -1 }, project: { password: 0 } }
);
```

**Exemplo de resposta:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "João Silva",
      "active": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Maria Santos",
      "active": true,
      "createdAt": "2024-01-14T08:20:00.000Z"
    }
  ],
  "total": 45,
  "page": 2,
  "limit": 20
}
```

#### `create(data?)`

Remove chaves com `undefined` usando `removeUndefined` antes de persistir.
Útil quando payloads vêm de forms ou APIs com campos opcionais.

> Retorna: `Promise<T>`

```typescript
const newUser = await userService.create({ name: 'Sofia', role: undefined, metadata: { age: 30 } });
```

**Exemplo de resposta:**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "name": "Sofia",
  "metadata": {
    "age": 30
  },
  "createdAt": "2024-01-20T14:25:00.000Z",
  "__v": 0
}
```

#### `update(query?, data?)`

Executa `model.updateOne` com o filtro informado.
Payload tem `undefined` removidos automaticamente.

> Retorna: `Query<UpdateResult, T>`

```typescript
const result = await userService.update({ _id: userId }, { lastLogin: new Date() });
```

**Exemplo de resposta:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

#### `remove(query?)`

Encaminha para `model.remove` e retorna o resultado bruto do MongoDB.

> Retorna: `Query<UpdateResult, T>`

```typescript
const result = await userService.remove({ email: 'temp@example.com' });
```

**Exemplo de resposta:**

```json
{
  "acknowledged": true,
  "deletedCount": 1
}
```

### Utilitários

#### `aggregate(pipeline)`

Proxy direto para `model.aggregate` para cenários customizados.

> Retorna: `Aggregate<unknown[]>`

```typescript
const stats = await userService.aggregate([
  { $match: { active: true } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
]);
```

**Exemplo de resposta:**

```json
[
  { "_id": "admin", "count": 5 },
  { "_id": "user", "count": 38 },
  { "_id": "manager", "count": 2 }
]
```

#### `hasAny(fields?, exclude?)`

Verifica colisões de campos (e.g. email duplicado) usando `$or`.
`exclude` aceita um `_id` em string para ignorar o próprio registro.

> Retorna: `Promise<string[]>`

```typescript
const conflicts = await userService.hasAny(
  { email: 'john@example.com', username: 'johnny' },
  '653cfa2c10ed3f00f1c15e5b'
);
if (conflicts.length) {
  throw new Error(`Campos já utilizados: ${conflicts.join(', ')}`);
}
```

**Exemplo de resposta:**

```json
["email"]
```

### Operações em Caminhos

As funções abaixo trabalham sobre subdocumentos identificados via caminho (veja a sintaxe na próxima seção).

#### `findOnePath(query?, path)`

Retorna o primeiro subdocumento encontrado.

> Retorna: `Promise<R | null>`

```typescript
const item = await userService.findOnePath({ _id: userId }, 'items.id:item1');
```

**Exemplo de resposta:**

```json
{
  "_id": "507f1f77bcf86cd799439020",
  "name": "Item 1",
  "price": 99.90,
  "tags": ["electronics", "sale"]
}
```

#### `findAllPath(query?, path, options?)`

Pagina itens de um array aninhado usando a mesma estratégia de `findAll`.

> Retorna: `Promise<FindAllResponse<R>>`

```typescript
const purchases = await userService.findAllPath(
  { _id: userId },
  'purchases',
  { limit: 5, page: 2, sort: { createdAt: -1 } }
);
```

**Exemplo de resposta:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439030",
      "product": "Notebook",
      "amount": 2500.00,
      "createdAt": "2024-01-18T16:45:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439031",
      "product": "Mouse",
      "amount": 50.00,
      "createdAt": "2024-01-17T10:30:00.000Z"
    }
  ],
  "total": 12,
  "page": 2,
  "limit": 5
}
```

#### `createPath(query?, path, data)`

Adiciona um novo item a um array aninhado com `$push`.

> Retorna: `Promise<UpdateResult>`

```typescript
const result = await userService.createPath({ _id: userId }, 'items', { name: 'Novo item', price: 15 });
```

**Exemplo de resposta:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

#### `updatePath(query?, path, data)`

Atualiza campos de um subdocumento usando `$set` com `arrayFilters` geradas automaticamente.

> Retorna: `Promise<UpdateResult>`

```typescript
const result = await userService.updatePath({ _id: userId }, 'items.id:item1', { name: 'Item atualizado' });
```

**Exemplo de resposta:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

#### `removePath(query?, path)`

Remove o subdocumento correspondente utilizando `$pull`.

> Retorna: `Promise<UpdateResult>`

```typescript
const result = await userService.removePath({ _id: userId }, 'items.id:item1');
```

**Exemplo de resposta:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

## Sintaxe de Caminhos

A sintaxe aceita segmentos separados por ponto (`.`). Segmentar por `id:<ObjectId>` filtra itens por `_id`.

```typescript
'items'                             // Array superior
'items.id:60f1b2b3c4a5d6e7f8f9a0b'   // Item específico
'items.id:... .tags.id:...'          // Subdocumento dentro de subdocumento
```

O helper valida automaticamente cada ObjectId, gera `$match`/`$unwind` para agregações e `arrayFilters` para updates.

## Funções Utilitárias

- `removeUndefined(data)`: limpa objetos/arrays ignorando valores que já são `ObjectId`.
- `getAggregationPath(path)`: transforma o caminho em estágios de agregação (`$match`, `$unwind`, `$replaceRoot`).
- `getUpdatePath(type, path, data?)`: cria a combinação de operação (`$push`, `$set`, `$pull`) e `arrayFilters` usada pelos métodos de caminho.

## Exemplos Completos

### Paginando comentários de um post

```typescript
const comments = await postService.findAllPath(
  { _id: postId },
  'comments',
  { limit: 10, page: 3, sort: { createdAt: -1 } }
);
```

**Exemplo de resposta:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439040",
      "author": "Maria Silva",
      "text": "Excelente post!",
      "createdAt": "2024-01-19T15:20:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439041",
      "author": "Carlos Santos",
      "text": "Muito útil, obrigado!",
      "createdAt": "2024-01-19T14:10:00.000Z"
    }
  ],
  "total": 47,
  "page": 3,
  "limit": 10
}
```
```

### Atualizando um endereço específico do usuário

```typescript
const result = await userService.updatePath(
  { _id: userId },
  'addresses.id:64f1c2d3e4f5a6b7c8d9e0f1',
  { label: 'Endereço Principal', city: 'São Paulo' }
);
```

**Exemplo de resposta:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```
```

## Suporte a TypeScript

```typescript
import superModel, { ServiceInstance, FindAllResponse } from '@ederzadravec/super-model-mongo';

// Interface simples com seus campos de negócio
interface User {
  name: string;
  email: string;
  active: boolean;
}

// Crie seu modelo Mongoose normalmente
const UserModel = mongoose.model<User>('User', userSchema);

// Especifique o tipo apenas uma vez no genérico
const service: ServiceInstance<User> = superModel<User>(UserModel);

// Todos os métodos retornam o tipo correto
const user: User | null = await service.findOne({ email: 'user@example.com' });
const result: FindAllResponse<User> = await service.findAll();
const newUser: User = await service.create({ name: 'João', email: 'joao@example.com', active: true });
```

**Principais vantagens:**
- Não é necessário estender `Document` ou usar tipos complexos
- Basta especificar sua interface uma vez: `superModel<User>(UserModel)`
- Todos os métodos retornam o tipo correto automaticamente
- Funciona com interfaces simples ou interfaces que estendem outros tipos customizados

## Licença

MIT
//   ]
