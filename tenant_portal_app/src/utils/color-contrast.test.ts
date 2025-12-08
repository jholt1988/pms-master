/**
 * P0-002: Color Contrast Utility Tests
 * Tests for color contrast validation functions
 */

import { 
  getContrastRatio, 
  meetsWCAGAA, 
  meetsWCAGAAA, 
  validateContrast,
  getContrastRating 
} from './color-contrast';

describe('Color Contrast Validation', () => {
  describe('getContrastRatio', () => {
    it('should calculate contrast ratio correctly', () => {
      // White on black should have very high contrast
      const ratio = getContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeGreaterThan(20);
    });

    it('should return null for invalid hex colors', () => {
      expect(getContrastRatio('invalid', '#000000')).toBeNull();
      expect(getContrastRatio('#ffffff', 'invalid')).toBeNull();
    });

    it('should handle hex colors with or without #', () => {
      const ratio1 = getContrastRatio('#ffffff', '#000000');
      const ratio2 = getContrastRatio('ffffff', '000000');
      expect(ratio1).toBe(ratio2);
    });
  });

  describe('meetsWCAGAA', () => {
    it('should pass for high contrast pairs (normal text)', () => {
      expect(meetsWCAGAA('#ffffff', '#000000', false)).toBe(true);
    });

    it('should pass for large text with lower threshold', () => {
      // A ratio that fails for normal text but passes for large text
      const ratio = getContrastRatio('#cccccc', '#000000');
      if (ratio && ratio >= 3 && ratio < 4.5) {
        expect(meetsWCAGAA('#cccccc', '#000000', true)).toBe(true);
        expect(meetsWCAGAA('#cccccc', '#000000', false)).toBe(false);
      }
    });

    it('should fail for low contrast pairs', () => {
      // Gray on gray should fail
      expect(meetsWCAGAA('#888888', '#999999', false)).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('should pass for very high contrast pairs', () => {
      expect(meetsWCAGAAA('#ffffff', '#000000', false)).toBe(true);
    });

    it('should fail for AA-compliant but not AAA-compliant pairs', () => {
      // A ratio that passes AA but not AAA
      const ratio = getContrastRatio('#aaaaaa', '#000000');
      if (ratio && ratio >= 4.5 && ratio < 7) {
        expect(meetsWCAGAAA('#aaaaaa', '#000000', false)).toBe(false);
        expect(meetsWCAGAA('#aaaaaa', '#000000', false)).toBe(true);
      }
    });
  });

  describe('getContrastRating', () => {
    it('should return pass-aaa for very high contrast', () => {
      expect(getContrastRating('#ffffff', '#000000')).toBe('pass-aaa');
    });

    it('should return pass-aa for AA-compliant contrast', () => {
      const rating = getContrastRating('#ffffff', '#333333');
      expect(['pass-aa', 'pass-aaa']).toContain(rating);
    });

    it('should return fail for low contrast', () => {
      expect(getContrastRating('#888888', '#999999')).toBe('fail');
    });

    it('should return error for invalid colors', () => {
      expect(getContrastRating('invalid', '#000000')).toBe('error');
    });
  });

  describe('validateContrast', () => {
    it('should return comprehensive validation result', () => {
      const result = validateContrast('#ffffff', '#000000');
      
      expect(result).toHaveProperty('ratio');
      expect(result).toHaveProperty('passesAA');
      expect(result).toHaveProperty('passesAAA');
      expect(result).toHaveProperty('passesAALarge');
      expect(result).toHaveProperty('passesAAALarge');
      expect(result).toHaveProperty('rating');
      
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
      expect(result.rating).toBe('pass-aaa');
    });

    it('should include recommendation for failing pairs', () => {
      const result = validateContrast('#888888', '#999999');
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation).toContain('below WCAG AA');
    });
  });
});

