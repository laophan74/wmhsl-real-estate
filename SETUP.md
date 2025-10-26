# Stone Real Estate Frontend Setup Guide

This guide will help you set up and run the Stone Real Estate frontend application from scratch.

## Prerequisites

### 1. Install Node.js

1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS version** (recommended for most users)
3. Run the installer and follow the installation wizard
4. Accept all default settings during installation

### 2. Verify Installation

Open your terminal/command prompt and verify the installation:

```bash
node --version
npm --version
```

You should see version numbers for both commands (e.g., `v18.17.0` for Node.js and `9.6.7` for npm).

## Project Setup

### 1. Clone or Download the Project

If you have the project files:
- Extract them to your desired location
- Open terminal/command prompt in the project directory

### 2. Install Dependencies

Navigate to the project root directory and run:

```bash
npm install
```

This will install all required dependencies listed in `package.json`.

### 3. Environment Configuration (Optional)

The application will work with default settings, but you can customize the backend URL:

1. Create a `.env` file in the project root
2. Add the following line:
   ```
   VITE_API_BASE_URL=https://stone-real-estate-real-capture-back.vercel.app
   ```

**Note**: All backend URLs are centrally managed in `src/config/api.js`. To change the backend URL, you can either:
- Update the environment variable `VITE_API_BASE_URL`
- Or modify the fallback URL in `src/config/api.js`

## Running the Application

### Development Mode

To start the development server:

```bash
npm run dev
```

The application will start and display:
- **Local URL**: `http://localhost:5173`
- **Network URL**: `http://[your-ip]:5173`

### Production Build

To build the application for production:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
wmhsl-real-estate/
├── public/                 # Static assets
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── pages/             # Application pages
│   ├── auth/              # Authentication logic
│   ├── lib/               # API client configuration
│   ├── config/            # Centralized configuration
│   │   └── api.js         # API URLs configuration
│   └── assets/            # Images, CSS files
├── index.html             # Main HTML file
├── package.json           # Dependencies and scripts
└── vite.config.js         # Vite configuration
```

## Available Features

### Public Features
- **Home Page**: Property inquiry form with contact information
- **About Page**: Company information
- **Contact Page**: Contact form and details

### Admin Features (Login Required)
- **Dashboard**: Manage leads, admins, and messages
- **Leads Management**: View, edit, and export property leads
- **Admin Management**: Create and manage admin accounts
- **Messages Management**: View and manage system messages

## Technology Stack

- **React 18**: Frontend framework
- **Material-UI**: Component library
- **Vite**: Build tool and development server
- **JWT Authentication**: Secure login system
- **Axios**: HTTP client for API requests

## Troubleshooting

### Common Issues

1. **Port already in use**: 
   - The default port is 5173
   - Vite will automatically use the next available port

2. **Dependencies not installing**:
   ```bash
   # Clear npm cache and try again
   npm cache clean --force
   npm install
   ```

3. **Build errors**:
   ```bash
   # Remove node_modules and reinstall
   rm -rf node_modules
   npm install
   ```

### Browser Compatibility

The application supports modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Tips

### Hot Reload
- The development server supports hot reload
- Changes to source code will automatically refresh the browser

### Code Structure
- Components are organized by feature in the `src/components` directory
- Pages are in the `src/pages` directory
- Global styles are in `src/assets/css/global.css`

### Authentication
- The application uses JWT tokens stored in localStorage
- Login session persists across browser refreshes
- Automatic token refresh on page reload

## Support

For technical support or questions:
- Check the browser console for error messages
- Ensure the backend API is running and accessible
- Verify all dependencies are properly installed

## Quick Start Summary

1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Open terminal in project directory
3. Run `npm install`
4. Run `npm run dev`
5. Open `http://localhost:5173` in your browser

The application should now be running successfully!