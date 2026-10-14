import { describe, it, expect } from 'vitest';
import { optimizeCoverUrl } from './GameCover';

const IGDB = 'https://images.igdb.com/igdb/image/upload/t_cover_small/co123abc.jpg';

describe('optimizeCoverUrl', () => {
  it('IGDB + size "lg" vira t_cover_big_2x', () => {
    expect(optimizeCoverUrl(IGDB, 'lg')).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co123abc.jpg');
  });

  it('IGDB + size "md"/"card" vira t_cover_big', () => {
    expect(optimizeCoverUrl(IGDB, 'md')).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/co123abc.jpg');
    expect(optimizeCoverUrl(IGDB, 'card')).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/co123abc.jpg');
  });

  it('IGDB + size "sm"/"thumb" vira t_cover_small', () => {
    expect(optimizeCoverUrl(IGDB, 'sm')).toBe(IGDB);
    expect(optimizeCoverUrl(IGDB, 'thumb')).toBe(IGDB);
  });

  it('URL fora do IGDB permanece igual', () => {
    const other = 'https://example.com/capa/meujogo.png';
    expect(optimizeCoverUrl(other, 'lg')).toBe(other);
  });

  it('placeholder antigo "co3i89" vira null', () => {
    expect(optimizeCoverUrl('https://images.igdb.com/igdb/image/upload/t_cover_big/co3i89.jpg', 'lg')).toBeNull();
  });

  it('vazio/null vira null', () => {
    expect(optimizeCoverUrl(null, 'lg')).toBeNull();
    expect(optimizeCoverUrl('', 'lg')).toBeNull();
    expect(optimizeCoverUrl('   ', 'lg')).toBeNull();
  });
});
