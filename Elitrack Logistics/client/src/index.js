import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
import { queryClient } from './queryClient';
import { registerServiceWorker } from './serviceWorkerRegistration';
import './tailwind.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<App />
			</ThemeProvider>
		</QueryClientProvider>
	</React.StrictMode>
);

registerServiceWorker();
