import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaTimes, FaGithub, FaLinkedin } from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";

const Navbar = () => {
  const [nav, setNav] = useState(false);
  const [shadow, setShadow] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const location = useLocation();

  const links = [
    { id: 1, link: "home", label: "Home" },
    { id: 2, link: "about", label: "About" },
    { id: 3, link: "experience", label: "Experience" },
    { id: 4, link: "skills", label: "Skills" },
    { id: 5, link: "projects", label: "Projects" },
    { id: 6, link: "contact", label: "Contact" },
  ];

  const pageLinks = [
    {
      id: 7,
      external: true,
      to: "https://prompt-injection.ghost.io/tag/blogs/",
      label: "Blog",
    },
    { id: 8, to: "/stories", label: "Stories" },
  ];

  useEffect(() => {
    const handleShadow = () => {
      if (window.scrollY >= 90) {
        setShadow(true);
      } else {
        setShadow(false);
      }
    };

    const handleScroll = () => {
      if (location.pathname === "/") {
        const sections = document.querySelectorAll("div[id]");
        const scrollPosition = window.scrollY;

        sections.forEach((section) => {
          const sectionTop = section.offsetTop - 100;
          const sectionHeight = section.offsetHeight;
          const sectionId = section.getAttribute("id");

          if (
            scrollPosition >= sectionTop &&
            scrollPosition < sectionTop + sectionHeight
          ) {
            setActiveSection(sectionId);
          }
        });
      }
    };

    window.addEventListener("scroll", handleShadow);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleShadow);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);

  return (
    <header
      className={
        shadow
          ? "fixed w-full h-20 shadow-custom z-50 bg-white/95 backdrop-blur-md"
          : "fixed w-full h-20 z-50 bg-white/90 backdrop-blur-sm"
      }
    >
      <div className="container-wide h-full flex items-center justify-between">
        <Link
          to="/"
          className="text-primary text-lg md:text-xl font-bold font-display"
        >
          <span className="gradient-text">Shreyans Khunteta</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-1 lg:space-x-2">
            {links.map(({ id, link, label }) => (
              <li key={id}>
                {location.pathname === "/" ? (
                  <a
                    href={`#${link}`}
                    className={`px-3 py-2 rounded-md mx-1 text-sm font-medium inline-block transition-all duration-300 relative ${
                      activeSection === link
                        ? "text-primary"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    {label}
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 rounded transition-all duration-300 ${
                        activeSection === link
                          ? "bg-primary scale-x-100"
                          : "bg-transparent scale-x-0 hover:bg-primary/30 hover:scale-x-100"
                      }`}
                    ></span>
                  </a>
                ) : (
                  <Link
                    to={`/#${link}`}
                    className="px-3 py-2 rounded-md mx-1 text-sm font-medium inline-block transition-all duration-300 relative text-secondary hover:text-primary"
                  >
                    {label}
                    <span className="absolute bottom-0 left-0 w-full h-0.5 rounded transition-all duration-300 bg-transparent scale-x-0 hover:bg-primary/30 hover:scale-x-100"></span>
                  </Link>
                )}
              </li>
            ))}
            {pageLinks.map(({ id, to, label, external }) => (
              <li key={id}>
                {external ? (
                  <a
                    href={to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-md mx-1 text-sm font-medium inline-block transition-all duration-300 relative text-secondary hover:text-primary"
                  >
                    {label}
                    <span className="absolute bottom-0 left-0 w-full h-0.5 rounded transition-all duration-300 bg-transparent scale-x-0 hover:bg-primary/30 hover:scale-x-100"></span>
                  </a>
                ) : (
                  <Link
                    to={to}
                    className={`px-3 py-2 rounded-md mx-1 text-sm font-medium inline-block transition-all duration-300 relative ${
                      location.pathname === to
                        ? "text-primary"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    {label}
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 rounded transition-all duration-300 ${
                        location.pathname === to
                          ? "bg-primary scale-x-100"
                          : "bg-transparent scale-x-0 hover:bg-primary/30 hover:scale-x-100"
                      }`}
                    ></span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile Menu Icon */}
        <div
          onClick={() => setNav(!nav)}
          className="md:hidden p-2 cursor-pointer"
        >
          <FaBars size={24} className="text-primary" />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={
          nav
            ? "md:hidden fixed inset-0 bg-black/70 z-50 transition-all ease-in duration-300"
            : "fixed inset-0 bg-black/0 -z-10 pointer-events-none transition-all ease-in duration-300"
        }
        onClick={() => setNav(false)}
      >
        <div
          className={
            nav
              ? "fixed right-0 top-0 w-3/4 sm:w-1/2 md:w-1/3 h-screen bg-white p-6 transition-all duration-300 ease-in-out overflow-y-auto"
              : "fixed -right-full top-0 h-screen bg-white p-6 transition-all duration-300 ease-in-out"
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-8">
            <Link
              to="/"
              className="text-primary text-lg font-bold font-display"
              onClick={() => setNav(false)}
            >
              <span className="gradient-text">Shreyans Khunteta</span>
            </Link>
            <button
              onClick={() => setNav(false)}
              className="rounded-full bg-gray-light p-2 hover:bg-gray-200 transition-colors"
              aria-label="Close menu"
            >
              <FaTimes size={18} className="text-primary" />
            </button>
          </div>

          <nav className="mb-8">
            <ul className="space-y-2">
              {links.map(({ id, link, label }) => (
                <li key={id}>
                  {location.pathname === "/" ? (
                    <a
                      onClick={() => setNav(false)}
                      href={`#${link}`}
                      className={`block py-3 px-4 rounded-md transition-colors relative ${
                        activeSection === link
                          ? "text-primary font-medium"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      {label}
                      <span
                        className={`absolute left-0 top-0 w-1 h-full rounded-l transition-all duration-300 ${
                          activeSection === link
                            ? "bg-primary"
                            : "bg-transparent"
                        }`}
                      ></span>
                    </a>
                  ) : (
                    <Link
                      to={`/#${link}`}
                      onClick={() => setNav(false)}
                      className="block py-3 px-4 rounded-md transition-colors relative text-secondary hover:text-primary"
                    >
                      {label}
                      <span className="absolute left-0 top-0 w-1 h-full rounded-l transition-all duration-300 bg-transparent"></span>
                    </Link>
                  )}
                </li>
              ))}
              {pageLinks.map(({ id, to, label, external }) => (
                <li key={id}>
                  {external ? (
                    <a
                      href={to}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setNav(false)}
                      className="block py-3 px-4 rounded-md transition-colors relative text-secondary hover:text-primary"
                    >
                      {label}
                      <span className="absolute left-0 top-0 w-1 h-full rounded-l transition-all duration-300 bg-transparent"></span>
                    </a>
                  ) : (
                    <Link
                      to={to}
                      onClick={() => setNav(false)}
                      className={`block py-3 px-4 rounded-md transition-colors relative ${
                        location.pathname === to
                          ? "text-primary font-medium"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      {label}
                      <span
                        className={`absolute left-0 top-0 w-1 h-full rounded-l transition-all duration-300 ${
                          location.pathname === to
                            ? "bg-primary"
                            : "bg-transparent"
                        }`}
                      ></span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="pt-6 border-t border-gray-200">
            <p className="uppercase text-sm tracking-widest text-gray-600 mb-4">
              Let's Connect
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="https://www.linkedin.com/in/shreyans-khunteta-3167247a/"
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-full shadow-custom p-3 cursor-pointer hover:scale-110 ease-in duration-300"
                aria-label="LinkedIn"
              >
                <FaLinkedin size={20} className="text-primary" />
              </a>
              <a
                href="https://github.com/SKhunteta"
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-full shadow-custom p-3 cursor-pointer hover:scale-110 ease-in duration-300"
                aria-label="GitHub"
              >
                <FaGithub size={20} className="text-primary" />
              </a>
              <a
                href="mailto:shreyans.khunteta@gmail.com"
                className="bg-white rounded-full shadow-custom p-3 cursor-pointer hover:scale-110 ease-in duration-300"
                aria-label="Email"
              >
                <HiOutlineMail size={20} className="text-primary" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
