"use client";

import Link from "next/link";
import { useState } from "react";

type StorefrontNavProps = {
  session: { name: string; role: string } | null;
};

export default function StorefrontNav({ session }: StorefrontNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link href="/" className="brand">
        <span className="brandicon" aria-hidden="true">📚</span>
        <span>ORIA<small>EXAM SUPPLIES · Wholesale &amp; Retail</small></span>
      </Link>
      <button
        className="navtoggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="primary-navigation"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          {isOpen ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
        <span>{isOpen ? "Close" : "Menu"}</span>
      </button>
      <div
        className={`navlinks${isOpen ? " is-open" : ""}`}
        id="primary-navigation"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) setIsOpen(false);
        }}
      >
        <div className="navlinks-inner">
          <Link href="/">Home</Link><a href="#about">About Us</a><a href="#products">Our Products</a><a href="#services">Services</a><a href="#visit">Find Us</a><a href="#contact">Contact</a><Link href="/points">Rewards</Link><Link href="/cart">Basket</Link>
          {session ? (
            <><span>Signed in as {session.name}</span>{session.role === "admin" && <Link className="btn" href="/admin">Admin</Link>}<form action="/api/auth/logout" method="post"><button className="btn" type="submit">Logout</button></form></>
          ) : (
            <><Link className="btn" href="/login">Login</Link><Link className="btn gold" href="/register">Register</Link></>
          )}
        </div>
      </div>
    </nav>
  );
}
