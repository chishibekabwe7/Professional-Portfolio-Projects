import { describe, it, expect } from 'vitest';
import { getSocialLinksWithIcons, navConfig } from './navigationConfig';
import { Github, Linkedin, Mail } from 'lucide-react';
import '../../../test/mocks';

describe('navigationConfig', () => {
  describe('socialLinks', () => {
    const socialLinks = getSocialLinksWithIcons();
    
    it('contains the correct number of social links', () => {
      expect(socialLinks).toHaveLength(3);
    });
    
    it('has GitHub link with correct properties', () => {
      const githubLink = socialLinks.find(link => link.label === 'GitHub');
      expect(githubLink).toBeDefined();
      expect(githubLink.href).toContain('https://github.com/');
      expect(githubLink.icon).toBe(Github);
      expect(githubLink.color).toBe('hover:text-[#2DA44E]');
    });
    
    it('has LinkedIn link with correct properties', () => {
      const linkedinLink = socialLinks.find(link => link.label === 'LinkedIn');
      expect(linkedinLink).toBeDefined();
      expect(linkedinLink.href).toContain('https://linkedin.com/in/');
      expect(linkedinLink.icon).toBe(Linkedin);
      expect(linkedinLink.color).toBe('hover:text-[#0A66C2]');
    });
    
    it('has Email link with correct properties', () => {
      const emailLink = socialLinks.find(link => link.label === 'Email');
      expect(emailLink).toBeDefined();
      expect(emailLink.href).toContain('mailto:');
      expect(emailLink.icon).toBe(Mail);
      expect(emailLink.color).toBe('hover:text-[#00C8DC]');
    });
  });
  
  describe('navConfig', () => {
    it('has mobileMenuTransition with correct properties', () => {
      expect(navConfig.mobileMenuTransition).toBeDefined();
      expect(navConfig.mobileMenuTransition.initial).toEqual({ opacity: 0, height: 0 });
      expect(navConfig.mobileMenuTransition.animate).toEqual({ opacity: 1, height: 'auto' });
      expect(navConfig.mobileMenuTransition.exit).toEqual({ opacity: 0, height: 0 });
    });
    
    it('has iconAnimation with correct properties', () => {
      expect(navConfig.iconAnimation).toBeDefined();
      expect(navConfig.iconAnimation.whileHover).toEqual({ scale: 1.1 });
      expect(navConfig.iconAnimation.whileTap).toEqual({ scale: 0.95 });
    });
  });
}); 