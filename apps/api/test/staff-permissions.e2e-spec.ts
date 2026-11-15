import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { databaseFixture, type DatabaseFixture } from './database-fixture.js';

describe('Manager inherits staff operations with manager-only product status', () => {
  let f: DatabaseFixture;
  let manager: Awaited<ReturnType<DatabaseFixture['user']>>;

  beforeAll(async () => {
    f = await databaseFixture();
    manager = await f.user('MANAGER');
  }, 35000);

  afterAll(async () => {
    await f?.close();
  });

  async function paidOrder() {
    const ingredient = await f.db.ingredient.create({
      data: {
        code: randomUUID(),
        name: randomUUID(),
        unit: 'GRAM',
        stockQuantity: 1000,
      },
    });
    const product = await f.db.product.create({
      data: {
        name: randomUUID(),
        category: 'Staff permissions',
        price: 10000,
        imageUrl: '/test.jpg',
        recipes: {
          create: {
            size: 'S',
            isActive: true,
            ingredients: {
              create: {
                ingredientId: ingredient.id,
                unit: 'GRAM',
                quantity: 10,
              },
            },
          },
        },
      },
    });
    const order = await f
      .api('post', '/orders', f.customer.token)
      .send({
        items: [
          { productId: product.id, size: 'S', quantity: 1, toppingIds: [] },
        ],
      })
      .expect(201);
    const payment = await f
      .api('post', '/payments', f.customer.token)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId: order.body.id, method: 'WALLET', mockResult: 'SUCCESS' })
      .expect(201);
    return {
      orderId: order.body.id as number,
      paymentId: payment.body.payment.id as number,
    };
  }

  it('lets MANAGER maintain ingredients, receipts, adjustments, toppings and recipes with the correct actor', async () => {
    const ingredient = (
      await f
        .api('post', '/inventory/ingredients', manager.token)
        .send({ code: randomUUID(), name: randomUUID(), unit: 'GRAM' })
        .expect(201)
    ).body;
    await f.api('get', '/inventory/units', manager.token).expect(200);
    await f.api('get', '/inventory/ingredients', manager.token).expect(200);
    await f
      .api('get', `/inventory/ingredients/${ingredient.id}`, manager.token)
      .expect(200);
    await f
      .api('patch', `/inventory/ingredients/${ingredient.id}`, manager.token)
      .send({ name: randomUUID() })
      .expect(200);
    for (const [path, quantity] of [
      ['receipts', '100.000'],
      ['adjustments', '-1.000'],
    ]) {
      const result = await f
        .api('post', `/inventory/${path}`, manager.token)
        .set('Idempotency-Key', randomUUID())
        .send({ ingredientId: ingredient.id, quantity, reason: 'Manager test' })
        .expect(201);
      expect(result.body.actorId).toBe(manager.id);
    }
    await f.api('get', '/inventory/stock', manager.token).expect(200);
    await f.api('get', '/inventory/movements', manager.token).expect(200);
    const topping = (
      await f
        .api('post', '/products/toppings', manager.token)
        .send({ name: randomUUID(), price: 1000 })
        .expect(201)
    ).body;
    await f
      .api('put', `/products/toppings/${topping.id}/recipe`, manager.token)
      .send({ ingredientId: ingredient.id, quantityPerServing: '5.000' })
      .expect(200);
    await f
      .api('get', `/products/toppings/${topping.id}/recipe`, manager.token)
      .expect(200);
    const product = (
      await f
        .api('post', '/products', manager.token)
        .send({
          name: randomUUID(),
          category: 'Manager',
          price: 10000,
          toppingIds: [topping.id],
        })
        .expect(201)
    ).body;
    await f
      .api('patch', `/products/${product.id}/toppings`, manager.token)
      .send({ toppingIds: [] })
      .expect(200);
    await f
      .api('put', `/products/${product.id}/recipes/S`, manager.token)
      .send({
        isActive: true,
        ingredients: [{ ingredientId: ingredient.id, quantity: '10.000' }],
      })
      .expect(200);
    await f
      .api('get', `/products/${product.id}/recipes/S`, manager.token)
      .expect(200);
    await f.api('get', '/inventory/stock', f.customer.token).expect(403);
  });

  it("lets MANAGER view and process another customer's order without exposing its payment link", async () => {
    const { orderId, paymentId } = await paidOrder();
    await f.db.payment.update({
      where: { id: paymentId },
      data: { paymentUrl: 'https://example.test/private-payment' },
    });
    await f.api('get', '/orders', manager.token).expect(200);
    const active = await f
      .api('get', '/orders/active', manager.token)
      .expect(200);
    expect(
      active.body.some((order: { id: number }) => order.id === orderId),
    ).toBe(true);
    const detail = await f
      .api('get', `/orders/${orderId}`, manager.token)
      .expect(200);
    expect(detail.body.payments[0].paymentUrl).toBeNull();
    const payment = await f
      .api('get', `/payments/${paymentId}`, manager.token)
      .expect(200);
    expect(payment.body.paymentUrl).toBeNull();
    const outsider = await f.user();
    await f.api('get', `/orders/${orderId}`, outsider.token).expect(403);
    await f.api('get', `/payments/${paymentId}`, outsider.token).expect(403);
    await f
      .api('patch', `/orders/${orderId}/status`, f.customer.token)
      .send({ status: 'PREPARING' })
      .expect(403);
    for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
      const changed = await f
        .api('patch', `/orders/${orderId}/status`, manager.token)
        .send({ status })
        .expect(200);
      expect(changed.body.status).toBe(status);
    }
  });

  it("lets MANAGER cancel another customer's paid order and release its inventory", async () => {
    const { orderId } = await paidOrder();
    const cancelled = await f
      .api('post', `/orders/${orderId}/cancel`, manager.token)
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(
      (
        await f.db.inventoryReservation.findUniqueOrThrow({
          where: { orderId },
        })
      ).status,
    ).toBe('RELEASED');
  });

  it('lets MANAGER refund while CUSTOMER remains forbidden, with replay settling only once', async () => {
    const { paymentId } = await paidOrder();
    await f
      .api('post', `/payments/${paymentId}/refund`, f.customer.token)
      .expect(403);
    expect(await f.db.paymentRefund.count({ where: { paymentId } })).toBe(0);
    const refunded = await f
      .api('post', `/payments/${paymentId}/refund`, manager.token)
      .expect(200);
    expect(refunded.body.refund.status).toBe('SUCCESS');
    expect(refunded.body.payment.refundedAmount).toBe(10000);
    await f
      .api('post', `/payments/${paymentId}/refund`, manager.token)
      .expect(200);
    expect(await f.db.paymentRefund.count({ where: { paymentId } })).toBe(1);
  });
});
