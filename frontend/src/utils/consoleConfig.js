// Console configuration to reduce noise in development
if (process.env.NODE_ENV === 'development') {
  // Store original console methods
  const originalWarn = console.warn;
  const originalError = console.error;

  // Filter out specific warnings
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Suppress specific warnings
    if (
      message.includes('WebSocket connection') ||
      message.includes('localhost:5173') ||
      message.includes('HMR') ||
      message.includes('Hot reload') ||
      message.includes('Failed to fetch') ||
      message.includes('net::ERR_CONNECTION_REFUSED')
    ) {
      return; // Don't log these warnings
    }
    
    // Log other warnings normally
    originalWarn.apply(console, args);
  };

  // Filter out specific errors
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Suppress specific errors
    if (
      message.includes('WebSocket connection') ||
      message.includes('localhost:5173') ||
      message.includes('HMR') ||
      message.includes('Hot reload') ||
      message.includes('Failed to fetch') ||
      message.includes('net::ERR_CONNECTION_REFUSED')
    ) {
      return; // Don't log these errors
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };

  // Suppress specific window errors
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    
    if (
      message.includes('WebSocket') ||
      message.includes('HMR') ||
      message.includes('Hot reload') ||
      message.includes('localhost:5173')
    ) {
      event.preventDefault();
      return false;
    }
  });

  // Suppress unhandled promise rejections for development server issues
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason || '';
    
    if (
      message.includes('WebSocket') ||
      message.includes('HMR') ||
      message.includes('Hot reload') ||
      message.includes('localhost:5173') ||
      message.includes('Failed to fetch')
    ) {
      event.preventDefault();
      return false;
    }
  });
}

export default {};
