
import { describe, expect, it } from 'bun:test';
import { whoisLookup } from '../handlers/whois_lookup';

describe('whoisLookup', () => {
  it('should return WHOIS data for a valid domain', async () => {
    const result = await whoisLookup('example.com');
    
    expect(result.domain_name).toEqual('example.com');
    expect(result.success).toBe(true);
    expect(result.registrar).toBeDefined();
    expect(result.whois_data).toBeDefined();
    expect(typeof result.whois_data).toBe('string');
    expect(result.whois_data.length).toBeGreaterThan(0);
  });

  it('should handle domain with expiry date', async () => {
    const result = await whoisLookup('example.com');
    
    expect(result.expiry_date).toBeInstanceOf(Date);
    expect(result.registrar).toEqual('Example Registrar Inc.');
    expect(result.whois_data).toContain('EXAMPLE.COM');
    expect(result.whois_data).toContain('Example Registrar Inc.');
  });

  it('should handle expired domain', async () => {
    const result = await whoisLookup('expired-domain.com');
    
    expect(result.domain_name).toEqual('expired-domain.com');
    expect(result.success).toBe(true);
    expect(result.expiry_date).toBeInstanceOf(Date);
    expect(result.expiry_date!.getFullYear()).toBe(2023);
    expect(result.registrar).toEqual('Old Registrar LLC');
    expect(result.whois_data).toContain('expired');
  });

  it('should handle domain with no expiry date', async () => {
    const result = await whoisLookup('no-expiry.com');
    
    expect(result.domain_name).toEqual('no-expiry.com');
    expect(result.success).toBe(true);
    expect(result.expiry_date).toBeNull();
    expect(result.registrar).toEqual('Unknown Registrar');
    expect(result.whois_data).toContain('NO-EXPIRY.COM');
  });

  it('should handle unknown domain with default data', async () => {
    const result = await whoisLookup('unknown-domain.com');
    
    expect(result.domain_name).toEqual('unknown-domain.com');
    expect(result.success).toBe(true);
    expect(result.expiry_date).toBeNull();
    expect(result.registrar).toEqual('Unknown Registrar');
    expect(result.whois_data).toContain('UNKNOWN-DOMAIN.COM');
    expect(result.whois_data).toContain('No additional WHOIS data available');
  });

  it('should preserve case sensitivity in domain name', async () => {
    const result = await whoisLookup('Example.COM');
    
    expect(result.domain_name).toEqual('Example.COM');
    expect(result.success).toBe(true);
    // Should still match the lowercase lookup for mock data
    expect(result.registrar).toEqual('Example Registrar Inc.');
  });

  it('should return valid WhoisResult structure for any input', async () => {
    const result = await whoisLookup('test-domain.org');
    
    // Verify all required fields are present
    expect(result).toHaveProperty('domain_name');
    expect(result).toHaveProperty('expiry_date');
    expect(result).toHaveProperty('registrar');
    expect(result).toHaveProperty('whois_data');
    expect(result).toHaveProperty('success');
    
    // Verify types
    expect(typeof result.domain_name).toBe('string');
    expect(result.expiry_date === null || result.expiry_date instanceof Date).toBe(true);
    expect(typeof result.registrar).toBe('string');
    expect(typeof result.whois_data).toBe('string');
    expect(typeof result.success).toBe('boolean');
  });
});
