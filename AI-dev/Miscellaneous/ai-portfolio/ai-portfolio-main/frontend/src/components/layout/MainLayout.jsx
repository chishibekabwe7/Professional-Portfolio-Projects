import PropTypes from 'prop-types'
import { NavBar } from './NavBar'

export const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed inset-0 bg-grid-pattern opacity-10" />
      <NavBar />
      <main className="pt-24 px-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired
} 