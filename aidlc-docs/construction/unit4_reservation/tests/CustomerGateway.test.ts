import { describe, it, expect, vi } from 'vitest';
import type { CustomerGateway, CustomerInfo, CustomerSearchResult } from '../src/CustomerGateway';
import { CustomerId } from '../src/CustomerId';
import { OwnerId } from '../src/OwnerId';
import { LineUserId } from '../src/LineUserId';

/**
 * CustomerGateway インターフェースのテスト。
 * Gateway インターフェースの実装自体はモックとし、インターフェース契約を vi.fn() で確認する。
 */
describe('CustomerGateway インターフェース', () => {
  const OWNER_ID = OwnerId.create('owner-001');
  const CUSTOMER_ID = CustomerId.create('customer-001');
  const LINE_USER_ID = LineUserId.create('U1234567890abcdef1234567890abcdef')!;

  const SAMPLE_CUSTOMER: CustomerInfo = {
    customerId: 'customer-001',
    ownerId: 'owner-001',
    customerName: '田中太郎',
    displayName: '田中',
    lineUserId: 'U1234567890abcdef1234567890abcdef',
    isLineLinked: true,
    registeredAt: '2024-01-01T00:00:00Z',
  };

  function createMockCustomerGateway(overrides: Partial<CustomerGateway> = {}): CustomerGateway {
    return {
      findById: vi.fn().mockResolvedValue(SAMPLE_CUSTOMER),
      findByLineUserId: vi.fn().mockResolvedValue(SAMPLE_CUSTOMER),
      searchByName: vi.fn().mockResolvedValue({
        customers: [
          {
            customerId: 'customer-001',
            customerName: '田中太郎',
            isLineLinked: true,
          },
        ],
        total: 1,
      } satisfies CustomerSearchResult),
      create: vi.fn().mockResolvedValue(SAMPLE_CUSTOMER),
      ...overrides,
    };
  }

  it('findById が CustomerInfo を返すこと', async () => {
    const gateway = createMockCustomerGateway();
    const result = await gateway.findById(CUSTOMER_ID);

    expect(result).not.toBeNull();
    expect(result!.customerId).toBe('customer-001');
    expect(result!.customerName).toBe('田中太郎');
  });

  it('findById で存在しない顧客の場合に null が返ること（404 CUSTOMER_NOT_FOUND）', async () => {
    const gateway = createMockCustomerGateway({
      findById: vi.fn().mockResolvedValue(null),
    });

    const result = await gateway.findById(CustomerId.create('non-existent'));
    expect(result).toBeNull();
  });

  it('findByLineUserId が CustomerInfo を返すこと', async () => {
    const gateway = createMockCustomerGateway();
    const result = await gateway.findByLineUserId(OWNER_ID, LINE_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.lineUserId).toBe('U1234567890abcdef1234567890abcdef');
  });

  it('findByLineUserId で該当なしの場合に null が返ること', async () => {
    const gateway = createMockCustomerGateway({
      findByLineUserId: vi.fn().mockResolvedValue(null),
    });

    const result = await gateway.findByLineUserId(OWNER_ID, LINE_USER_ID);
    expect(result).toBeNull();
  });

  it('searchByName が CustomerSearchResult を返すこと', async () => {
    const gateway = createMockCustomerGateway();
    const result = await gateway.searchByName(OWNER_ID, '田中');

    expect(result.customers).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.customers[0].customerName).toBe('田中太郎');
  });

  it('create が新規作成された CustomerInfo を返すこと', async () => {
    const gateway = createMockCustomerGateway();
    const result = await gateway.create(OWNER_ID, '佐藤花子');

    expect(result).not.toBeNull();
    expect(result.customerId).toBeDefined();
    expect(result.customerName).toBeDefined();
  });
});
