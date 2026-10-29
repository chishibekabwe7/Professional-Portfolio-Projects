import { Github, Linkedin, Mail, BookOpen, Code, BookOpen as Blog } from 'lucide-react'
import { getSocialLinks } from '../../../config/configLoader'

// Social links are now loaded from the configuration
// The icons are still defined here since they are React components
export const getSocialLinksWithIcons = () => {
  const social = getSocialLinks();
  
  // Create the social links array with icons
  return [
    { 
      href: social?.github?.url || "https://github.com", 
      icon: Github, 
      label: "GitHub",
      color: "hover:text-[#2DA44E]"  // GitHub color
    },
    { 
      href: social?.linkedin?.url || "https://linkedin.com", 
      icon: Linkedin, 
      label: "LinkedIn",
      color: "hover:text-[#0A66C2]"  // LinkedIn color
    },
    { 
      href: social?.email?.url || "mailto:example@example.com", 
      icon: Mail, 
      label: "Email",
      color: "hover:text-[#00C8DC]"  // Matching site theme
    }
  ];
};

export const navConfig = {
  mobileMenuTransition: {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: { opacity: 0, height: 0 }
  },
  iconAnimation: {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.95 }
  }
} 

export const sections = {
  about: {
    icon: BookOpen,
    title: 'About Me',
    path: '/about-me',
    color: 'from-blue-500 to-cyan-500'
  },
  projects: {
    icon: Code,
    title: 'Projects',
    path: '/projects',
    color: 'from-emerald-500 to-green-500'
  },
  blog: {
    icon: Blog,
    title: 'Blog',
    path: '/blog',
    color: 'from-pink-500 to-rose-500'
  }
} 