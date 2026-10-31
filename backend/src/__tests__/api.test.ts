import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('RDS read scaling API', () => {
  it('returns an OK health payload', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('primary');
    expect(response.body).toHaveProperty('replica');
    expect(response.body).toHaveProperty('monitoring');
  });

  it('lists the allowed read-only queries', async () => {
    const response = await request(app).get('/api/queries');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('rejects invalid query keys', async () => {
    const response = await request(app)
      .post('/api/query')
      .send({ target: 'primary', queryKey: 'drop_table', params: [] });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
