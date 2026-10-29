import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { sections } from '../config/navigationConfig'
import { navConfig } from '../config/navigationConfig'
import { SocialLinks } from '../shared/SocialLinks'

export const MobileNav = ({ isMenuOpen, setIsMenuOpen }) => {
  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          {...navConfig.mobileMenuTransition}
          className="md:hidden mt-4"
        >
          {/* Navigation Links */}
          <div className="flex flex-col space-y-2 mb-4">
            {Object.entries(sections).map(([key, { icon: Icon, title, path }]) => (
              <NavLink
                key={key}
                to={path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) => `
                  px-4 py-3 rounded-lg flex items-center space-x-2 transition-colors w-full
                  ${isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-400 hover:text-[#00C8DC] hover:bg-white/5'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{title}</span>
              </NavLink>
            ))}
          </div>

          {/* Social Links */}
          <div className="border-t border-white/10 pt-4">
            <div className="px-4 py-2 text-sm text-gray-500">Connect with me</div>
            <div className="px-4 py-2">
              <SocialLinks isMobile />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

MobileNav.propTypes = {
  isMenuOpen: PropTypes.bool.isRequired,
  setIsMenuOpen: PropTypes.func.isRequired
} 