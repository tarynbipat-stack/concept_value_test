import React from 'react';
import './globals.css';
import Header from '../components/Header';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <html lang="en">
            <body>
                <Header />
                <main>{children}</main>
            </body>
        </html>
    );
};

export default Layout;