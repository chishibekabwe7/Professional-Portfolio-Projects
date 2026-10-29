# React Frontend Service 🎨

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)


## 🚀 Local Setup Instructions

1. Ensure Node.js 20.x is installed

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   # Create .env file with:
   VITE_BACKEND_URL=http://localhost:8000  # or your backend URL
   ```

4. Add your personal content:
   - Add `about-me.md` to public folder
   - Add `icon.svg` to public folder
   - Add `profile.jpg` to public folder
   - Update `config.json` following the [Config Setup Guide](CONFIGURATION.md)

5. Start development server:
   ```bash
   npm run dev
   ```

6. Visit http://localhost:5173 to view the app 🎉

## 🛠 Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🧪 Testing

This project uses Vitest and React Testing Library for unit testing. Tests are organized alongside their components.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 🚀 Deployment on Vercel

1. Create an account on [Vercel.com](https://vercel.com)

2. Create a new project and connect to your repository

3. Configure environment variables:
   ```bash
   VITE_BACKEND_URL=https://your-backend-url
   ```

4. Deploy! Your app will be available at https://your-project-name.vercel.app 🎉

## 🛠 Tech Stack

- React 18
- Vite
- TailwindCSS
- Framer Motion
- React Router DOM
- ESLint

