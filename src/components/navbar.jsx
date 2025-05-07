import React, { useState, useEffect } from "react";
import { FaBars, FaTimes, FaGithub, FaLinkedin } from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";

const Navbar = () => {
  const [nav, setNav] = useState(false);
  const [shadow, setShadow] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const links = [
    { id: 1, link: "home", label: "Home" },
    { id: 2, link: "about", label: "About" },
    { id: 3, link: "experience", label: "Experience" },
    { id: 4, link: "skills", label: "Skills" },
    { id: 5, link: "projects", label: "Projects" },
    { id: 6, link: "contact", label: "Contact" },
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
    };

    window.addEventListener("scroll", handleShadow);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleShadow);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={
        shadow
          ? "fixed w-full h-20 shadow-custom z-50 bg-white/95 backdrop-blur-md"
          : "fixed w-full h-20 z-50 bg-white/90 backdrop-blur-sm"
      }
    >
      <div className="container-wide h-full flex items-center justify-between">
        <a
          href="#home"
          className="text-primary text-lg md:text-xl font-bold font-display"
        >
          <span className="gradient-text">Shreyans Khunteta</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-1 lg:space-x-2">
            {links.map(({ id, link, label }) => (
              <li key={id}>
                <a
                  href={`#${link}`}
                  className={`px-3 py-2 rounded-md mx-1 text-sm font-medium transition-all duration-300 ${
                    activeSection === link
                      ? "text-primary bg-primary/5"
                      : "text-secondary hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {label}
                </a>
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
            <a
              href="#home"
              className="text-primary text-lg font-bold font-display"
            >
              <span className="gradient-text">Shreyans Khunteta</span>
            </a>
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
                  <a
                    onClick={() => setNav(false)}
                    href={`#${link}`}
                    className={`block py-3 px-4 rounded-md transition-colors ${
                      activeSection === link
                        ? "bg-primary/5 text-primary font-medium"
                        : "text-secondary hover:bg-gray-light"
                    }`}
                  >
                    {label}
                  </a>
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
