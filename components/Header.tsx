import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => {
    return (
        <header className="bg-slate-900 text-white px-6 py-3">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
                <Link href="/" className="text-lg font-semibold tracking-tight hover:text-slate-300">
                    Compass
                </Link>
                <nav>
                    <ul className="flex space-x-4 text-sm">
                        <li><Link href="/" className="hover:text-slate-300">Studies</Link></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;