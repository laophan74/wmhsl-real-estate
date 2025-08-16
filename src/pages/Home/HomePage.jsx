import React from 'react';
import './HomePage.css';


const HomePage = () => {
  return (
    <div className="home-page">
      <h1>Welcome to WMHSL Real Estate</h1>
      <p>Find your dream property with us</p>
      <form className="home-contact-form" style={{ maxWidth: 400, margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="text" name="name" placeholder="Your Name" required />
        <input type="email" name="email" placeholder="Your Email" required />
        <textarea name="message" placeholder="Your Message" rows={4} required />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default HomePage;